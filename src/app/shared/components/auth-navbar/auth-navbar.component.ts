import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UserSessionService } from '../../../auth/user-session.service';
import { LoginButtonComponent } from '../login-button/login-button.component';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';

@Component({
  selector: 'app-auth-navbar',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    RouterLink,
    RouterLinkActive,
    LoginButtonComponent,
    LogoutButtonComponent,
  ],
  templateUrl: './auth-navbar.component.html',
  styleUrl: './auth-navbar.component.css',
})
export class AuthNavbarComponent {
  private readonly userSessionService = inject(UserSessionService);

  readonly sessionState$ = this.userSessionService.sessionState$;
}
