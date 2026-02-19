import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

import { KeycloakService } from './keycloak.service';

export interface UserSessionState {
  readonly isAuthenticated: boolean;
  readonly username: string | null;
  readonly email: string | null;
  readonly roles: readonly string[];
}

const ANONYMOUS_SESSION_STATE: UserSessionState = {
  isAuthenticated: false,
  username: null,
  email: null,
  roles: [],
};

@Injectable({
  providedIn: 'root',
})
export class UserSessionService {
  private readonly sessionStateSubject =
    new BehaviorSubject<UserSessionState>(ANONYMOUS_SESSION_STATE);

  readonly sessionState$ = this.sessionStateSubject.asObservable();
  readonly isLoggedIn$ = this.sessionState$.pipe(
    map((state) => state.isAuthenticated),
    distinctUntilChanged(),
  );

  constructor(private readonly keycloakService: KeycloakService) {
    this.keycloakService.events$.subscribe(() => {
      this.syncFromToken();
    });
  }

  syncFromToken(): void {
    if (!this.keycloakService.isAuthenticated()) {
      this.clearSession();
      return;
    }

    this.sessionStateSubject.next({
      isAuthenticated: true,
      username: this.keycloakService.getUsername(),
      email: this.keycloakService.getEmail(),
      roles: this.keycloakService.getRealmRoles(),
    });
  }

  isLoggedIn(): boolean {
    return this.sessionStateSubject.value.isAuthenticated;
  }

  getUsername(): string | null {
    return this.sessionStateSubject.value.username;
  }

  getEmail(): string | null {
    return this.sessionStateSubject.value.email;
  }

  getRoles(): string[] {
    return [...this.sessionStateSubject.value.roles];
  }

  async logout(): Promise<void> {
    await this.keycloakService.logout();
    this.clearSession();
  }

  private clearSession(): void {
    this.sessionStateSubject.next(ANONYMOUS_SESSION_STATE);
  }
}
