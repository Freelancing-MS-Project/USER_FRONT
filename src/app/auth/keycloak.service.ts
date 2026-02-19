import { Injectable } from '@angular/core';
import Keycloak, { KeycloakError, KeycloakTokenParsed } from 'keycloak-js';
import { Subject } from 'rxjs';

import { SECURITY_CONFIG } from '../core/config/security.config';

export type KeycloakAuthEventType =
  | 'ready'
  | 'auth-success'
  | 'auth-error'
  | 'token-refresh-success'
  | 'token-refresh-error'
  | 'token-expired'
  | 'logout';

export interface KeycloakAuthEvent {
  readonly type: KeycloakAuthEventType;
  readonly payload?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class KeycloakService {
  private readonly keycloak = new Keycloak(SECURITY_CONFIG.keycloak);
  private readonly eventsSubject = new Subject<KeycloakAuthEvent>();

  private refreshTokenPromise: Promise<boolean> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  readonly events$ = this.eventsSubject.asObservable();

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.bindCallbacks();

    try {
      const authenticated = await this.keycloak.init(
        SECURITY_CONFIG.keycloakInitOptions,
      );

      this.eventsSubject.next({ type: 'ready', payload: authenticated });

      if (!authenticated) {
        throw new Error(
          'User is not authenticated after Keycloak initialization.',
        );
      }

      this.initialized = true;
      this.startTokenRefreshLoop();
    } catch (error: unknown) {
      console.error('Keycloak initialization failed.', error);
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.keycloak.authenticated);
  }

  getAccessToken(): string | null {
    return this.keycloak.token ?? null;
  }

  getParsedToken(): KeycloakTokenParsed | null {
    return this.keycloak.tokenParsed ?? null;
  }

  getUsername(): string | null {
    return (
      (this.keycloak.tokenParsed?.['preferred_username'] as
        | string
        | undefined) ?? null
    );
  }

  getEmail(): string | null {
    return (this.keycloak.tokenParsed?.['email'] as string | undefined) ?? null;
  }

  getRealmRoles(): string[] {
    return [...(this.keycloak.tokenParsed?.realm_access?.roles ?? [])];
  }

  async login(redirectUri: string = window.location.href): Promise<void> {
    await this.keycloak.login({ redirectUri });
  }

  async logout(redirectUri: string = `${window.location.origin}/public`): Promise<void> {
    try {
      await this.keycloak.logout({ redirectUri });
    } finally {
      this.keycloak.clearToken();
      this.stopTokenRefreshLoop();
      this.eventsSubject.next({ type: 'logout' });
    }
  }

  async getValidAccessToken(
    minValiditySeconds: number = SECURITY_CONFIG.minTokenValiditySeconds,
  ): Promise<string | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      await this.refreshToken(minValiditySeconds);
      return this.getAccessToken();
    } catch (error: unknown) {
      console.error('Failed to obtain a valid access token.', error);
      return null;
    }
  }

  async refreshToken(
    minValiditySeconds: number = SECURITY_CONFIG.minTokenValiditySeconds,
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = this.keycloak
      .updateToken(minValiditySeconds)
      .catch((error: unknown) => {
        console.error('Keycloak token refresh request failed.', error);
        throw error;
      })
      .finally(() => {
        this.refreshTokenPromise = null;
      });

    return this.refreshTokenPromise;
  }

  async forceRefreshToken(): Promise<string | null> {
    try {
      await this.refreshToken(0);
      return this.getAccessToken();
    } catch (error: unknown) {
      console.error('Forced token refresh failed.', error);
      return null;
    }
  }

  private bindCallbacks(): void {
    this.keycloak.onAuthSuccess = () => {
      this.eventsSubject.next({ type: 'auth-success' });
    };

    this.keycloak.onAuthError = (error?: KeycloakError) => {
      this.eventsSubject.next({ type: 'auth-error', payload: error });
      console.error('Keycloak authentication error.', error);
    };

    this.keycloak.onAuthRefreshSuccess = () => {
      this.eventsSubject.next({ type: 'token-refresh-success' });
    };

    this.keycloak.onAuthRefreshError = () => {
      this.eventsSubject.next({ type: 'token-refresh-error' });
      console.error('Keycloak token refresh failed.');
    };

    this.keycloak.onTokenExpired = () => {
      this.eventsSubject.next({ type: 'token-expired' });
      void this.refreshToken().catch((error: unknown) => {
        console.error('Automatic token refresh failed after expiration.', error);
      });
    };

    this.keycloak.onAuthLogout = () => {
      this.eventsSubject.next({ type: 'logout' });
      this.stopTokenRefreshLoop();
    };
  }

  private startTokenRefreshLoop(): void {
    if (this.refreshTimer) {
      return;
    }

    this.refreshTimer = setInterval(() => {
      void this.refreshToken().catch((error: unknown) => {
        console.error('Scheduled token refresh failed.', error);
      });
    }, SECURITY_CONFIG.tokenRefreshIntervalMs);
  }

  private stopTokenRefreshLoop(): void {
    if (!this.refreshTimer) {
      return;
    }

    clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }
}
