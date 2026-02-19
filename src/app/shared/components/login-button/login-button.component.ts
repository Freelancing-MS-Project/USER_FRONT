import { Component, inject, signal } from '@angular/core';

import { KeycloakService } from '../../../auth/keycloak.service';
import { UserSessionService } from '../../../auth/user-session.service';

@Component({
  selector: 'app-login-button',
  standalone: true,
  templateUrl: './login-button.component.html',
  styleUrl: './login-button.component.css',
})
export class LoginButtonComponent {
  private readonly keycloakService = inject(KeycloakService);
  private readonly userSessionService = inject(UserSessionService);

  readonly loading = signal(false);

  async login(): Promise<void> {
    if (this.loading() || this.userSessionService.isLoggedIn()) {
      return;
    }

    this.loading.set(true);

    try {
      await this.keycloakService.login();
    } finally {
      this.loading.set(false);
    }
  }
}
