import { Injectable } from '@angular/core';
import type { KeycloakTokenParsed } from 'keycloak-js';
import { KeycloakEventType, KeycloakService } from 'keycloak-angular';
import { BehaviorSubject } from 'rxjs';

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
export class AppAuthService {
  private readonly authStateSubject = new BehaviorSubject<AuthState>(
    ANONYMOUS_STATE,
  );

  readonly authState$ = this.authStateSubject.asObservable();

  constructor(private readonly keycloak: KeycloakService) {
    this.keycloak.keycloakEvents$.subscribe((event) => {
      if (
        event.type === KeycloakEventType.OnReady ||
        event.type === KeycloakEventType.OnAuthSuccess ||
        event.type === KeycloakEventType.OnAuthLogout ||
        event.type === KeycloakEventType.OnAuthRefreshSuccess
      ) {
        void this.syncAuthState();
      }
    });
  }

  async syncAuthState(): Promise<void> {
    const isAuthenticated = this.keycloak.isLoggedIn();

    if (!isAuthenticated) {
      this.authStateSubject.next(ANONYMOUS_STATE);
      return;
    }

    const parsedToken = this.keycloak.getKeycloakInstance().tokenParsed;

    this.authStateSubject.next({
      isAuthenticated,
      username: this.extractUsername(parsedToken),
    });
  }

  isLoggedIn(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  getUsername(): string | null {
    return this.authStateSubject.value.username;
  }

  async login(redirectUri: string = window.location.href): Promise<void> {
    await this.keycloak.login({ redirectUri });
  }

  async logout(redirectUri: string = `${window.location.origin}/home`): Promise<void> {
    await this.keycloak.logout(redirectUri);
    this.authStateSubject.next(ANONYMOUS_STATE);
  }

  async getToken(): Promise<string> {
    await this.keycloak.updateToken(20);
    return this.keycloak.getToken();
  }

  private extractUsername(tokenParsed?: KeycloakTokenParsed): string | null {
    if (!tokenParsed) {
      return null;
    }

    return (tokenParsed['preferred_username'] as string | undefined) ?? null;
  }
}
