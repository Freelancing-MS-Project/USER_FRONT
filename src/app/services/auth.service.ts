import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  tap,
  throwError,
} from 'rxjs';

import { SECURITY_CONFIG } from '../core/config/security.config';

interface KeycloakTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly refresh_expires_in: number;
  readonly token_type: string;
  readonly scope?: string;
}

export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly username: string | null;
}

const ANONYMOUS_STATE: AuthState = {
  isAuthenticated: false,
  username: null,
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenEndpoint = SECURITY_CONFIG.keycloakTokenEndpoint;

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
    this.syncAuthState();
  }

  syncAuthState(): void {
    if (!this.hasValidToken()) {
      this.clearSession(false);
      return;
    }

    this.scheduleLogout();
    this.authStateSubject.next({
      isAuthenticated: true,
      username: this.extractUsername(),
    });
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
        map(() => void 0),
        catchError(() => throwError(() => new Error('INVALID_CREDENTIALS'))),
      );
  }

  logout(redirectToLogin: boolean = true): void {
    this.clearSession(redirectToLogin);
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

  private clearSession(redirectToLogin: boolean): void {
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
    localStorage.removeItem(this.expiresAtStorageKey);

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    this.authStateSubject.next(ANONYMOUS_STATE);

    if (redirectToLogin) {
      void this.router.navigate(['/login']);
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

  private extractUsername(): string | null {
    const token = localStorage.getItem(this.accessTokenStorageKey);

    if (!token) {
      return null;
    }

    const payload = this.decodeJwtPayload(token);

    if (!payload) {
      return null;
    }

    return (payload['preferred_username'] as string | undefined) ?? null;
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
