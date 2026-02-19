import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  firstValueFrom,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { SECURITY_CONFIG } from '../core/config/security.config';

interface KeycloakTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly cin: string;
  readonly role: 'Client' | 'Freelancer';
}

export interface UserProfile {
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly cin?: string;
  readonly role?: string;
  readonly username?: string;
}

export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly firstName: string | null;
  readonly role: string | null;
  readonly email: string | null;
  readonly username: string | null;
}

const ANONYMOUS_STATE: AuthState = {
  isAuthenticated: false,
  firstName: null,
  role: null,
  email: null,
  username: null,
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenEndpoint = SECURITY_CONFIG.keycloakTokenEndpoint;
  private readonly registerEndpoint =
    `${SECURITY_CONFIG.backendBaseUrl}/api/users/register`;
  private readonly profileEndpoint =
    `${SECURITY_CONFIG.backendBaseUrl}/api/users/me`;

  private readonly clientId = SECURITY_CONFIG.keycloakClientId;

  private readonly accessTokenStorageKey = 'access_token';
  private readonly refreshTokenStorageKey = 'refresh_token';
  private readonly expiresAtStorageKey = 'expires_at';

  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly authStateSubject = new BehaviorSubject<AuthState>(
    ANONYMOUS_STATE,
  );

  readonly authState$ = this.authStateSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  async initialize(): Promise<void> {
    if (!this.hasValidToken()) {
      this.clearSession(false);
      return;
    }

    this.syncAuthState();
    this.scheduleLogout();

    try {
      await firstValueFrom(this.getUserProfile());
    } catch {
      // Keep token-based session even if profile endpoint is temporarily unavailable.
    }
  }

  login(username: string, password: string): Observable<void> {
    const body = new HttpParams()
      .set('client_id', this.clientId)
      .set('grant_type', 'password')
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http
      .post<KeycloakTokenResponse>(this.tokenEndpoint, body.toString(), {
        headers,
      })
      .pipe(
        tap((response) => this.storeSession(response)),
        tap(() => this.syncAuthState()),
        switchMap(() =>
          this.getUserProfile().pipe(
            map(() => void 0),
            catchError(() => {
              // Do not fail authentication if profile endpoint fails.
              return of(void 0);
            }),
          ),
        ),
        catchError((error: unknown) => {
          this.clearSession(false);

          if (
            error instanceof HttpErrorResponse &&
            (error.status === 400 || error.status === 401)
          ) {
            return throwError(() => new Error('INVALID_CREDENTIALS'));
          }

          return throwError(() => new Error('LOGIN_UNAVAILABLE'));
        }),
      );
  }

  register(payload: RegisterRequest): Observable<void> {
    return this.http.post<void>(this.registerEndpoint, payload).pipe(
      switchMap(() => this.login(payload.email, payload.password)),
      catchError((error: unknown) => {
        return throwError(() => error);
      }),
    );
  }

  getUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.profileEndpoint).pipe(
      tap((profile) => {
        const tokenState = this.buildStateFromToken();

        this.scheduleLogout();
        this.authStateSubject.next({
          isAuthenticated: tokenState.isAuthenticated,
          firstName: profile.firstName ?? tokenState.firstName,
          role: this.normalizeRole(profile.role) ?? tokenState.role,
          email: profile.email ?? tokenState.email,
          username:
            profile.username ??
            profile.email ??
            tokenState.username ??
            null,
        });
      }),
    );
  }

  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  getToken(): string | null {
    if (!this.hasValidToken()) {
      return null;
    }

    return localStorage.getItem(this.accessTokenStorageKey);
  }

  logout(redirectHome: boolean = true): void {
    this.clearSession(redirectHome);
  }

  syncAuthState(): void {
    if (!this.hasValidToken()) {
      this.clearSession(false);
      return;
    }

    this.authStateSubject.next(this.buildStateFromToken());
  }

  private hasValidToken(): boolean {
    const accessToken = localStorage.getItem(this.accessTokenStorageKey);

    if (!accessToken) {
      return false;
    }

    if (this.isTokenExpired(accessToken)) {
      this.clearSession(true);
      return false;
    }

    return true;
  }

  private storeSession(response: KeycloakTokenResponse): void {
    const expiresAt = Date.now() + response.expires_in * 1000;

    localStorage.setItem(this.accessTokenStorageKey, response.access_token);
    localStorage.setItem(this.refreshTokenStorageKey, response.refresh_token);
    localStorage.setItem(this.expiresAtStorageKey, String(expiresAt));
  }

  private clearSession(redirectHome: boolean): void {
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
    localStorage.removeItem(this.expiresAtStorageKey);

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    this.authStateSubject.next(ANONYMOUS_STATE);

    if (redirectHome) {
      void this.router.navigate(['/home']);
    }
  }

  private scheduleLogout(): void {
    const expiresAtRaw = localStorage.getItem(this.expiresAtStorageKey);

    if (!expiresAtRaw) {
      return;
    }

    const expiresAt = Number(expiresAtRaw);

    if (!Number.isFinite(expiresAt)) {
      this.clearSession(true);
      return;
    }

    const remainingMs = expiresAt - Date.now();

    if (remainingMs <= 0) {
      this.clearSession(true);
      return;
    }

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    this.logoutTimer = setTimeout(() => {
      this.clearSession(true);
    }, remainingMs);
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);

    if (!payload) {
      return true;
    }

    const exp = payload['exp'];

    if (typeof exp !== 'number') {
      return true;
    }

    return Date.now() >= exp * 1000;
  }

  private extractUsernameFromToken(): string | null {
    return this.extractClaim('preferred_username') ?? this.extractClaim('email');
  }

  private buildStateFromToken(): AuthState {
    return {
      isAuthenticated: true,
      firstName: this.extractClaim('given_name') ?? null,
      role: this.extractRoleFromToken(),
      email: this.extractClaim('email'),
      username: this.extractUsernameFromToken(),
    };
  }

  private extractRoleFromToken(): string | null {
    const payload = this.decodeJwtPayload(
      localStorage.getItem(this.accessTokenStorageKey) ?? '',
    );

    if (!payload) {
      return null;
    }

    const roleCandidates = [
      ...this.extractClientRoles(payload),
      ...this.extractRealmRoles(payload),
    ].filter((role) => !this.isTechnicalRole(role));

    if (roleCandidates.length === 0) {
      return null;
    }

    return this.formatRoleLabel(roleCandidates[0]);
  }

  private extractClientRoles(payload: Record<string, unknown>): string[] {
    const resourceAccess = payload['resource_access'] as
      | Record<string, { roles?: unknown[] }>
      | undefined;

    if (!resourceAccess) {
      return [];
    }

    const clientRoles = resourceAccess[this.clientId]?.roles;

    if (!Array.isArray(clientRoles)) {
      return [];
    }

    return clientRoles.filter((role): role is string => typeof role === 'string');
  }

  private extractRealmRoles(payload: Record<string, unknown>): string[] {
    const realmAccess = payload['realm_access'] as
      | { roles?: unknown[] }
      | undefined;

    if (!realmAccess || !Array.isArray(realmAccess.roles)) {
      return [];
    }

    return realmAccess.roles.filter(
      (role): role is string => typeof role === 'string',
    );
  }

  private isTechnicalRole(role: string): boolean {
    const normalized = role.toLowerCase();

    return (
      normalized.startsWith('default-roles-') ||
      normalized === 'offline_access' ||
      normalized === 'uma_authorization'
    );
  }

  private normalizeRole(role: string | null | undefined): string | null {
    if (!role) {
      return null;
    }

    if (this.isTechnicalRole(role)) {
      return null;
    }

    return this.formatRoleLabel(role);
  }

  private formatRoleLabel(role: string): string {
    const cleanedRole = role.replace(/^ROLE_/i, '');

    return cleanedRole
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private extractClaim(claimName: string): string | null {
    const token = localStorage.getItem(this.accessTokenStorageKey);

    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);

    if (!payload) {
      return null;
    }

    const claimValue = payload[claimName];

    return typeof claimValue === 'string' ? claimValue : null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    const tokenParts = token.split('.');

    if (tokenParts.length !== 3) {
      return null;
    }

    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
