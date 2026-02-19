import { Component, inject, signal } from '@angular/core';

import { UserSessionService } from '../../../auth/user-session.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  templateUrl: './logout-button.component.html',
  styleUrl: './logout-button.component.css',
})
export class LogoutButtonComponent {
  private readonly userSessionService = inject(UserSessionService);

  readonly loading = signal(false);

  async logout(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    try {
      await this.userSessionService.logout();
    } finally {
      this.loading.set(false);
    }
  }
}
