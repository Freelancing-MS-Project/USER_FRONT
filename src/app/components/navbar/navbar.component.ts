import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { AppAuthService, AuthState } from '../../services/keycloak.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  readonly authState$: Observable<AuthState>;

  authActionInProgress = false;

  constructor(private readonly appAuthService: AppAuthService) {
    this.authState$ = this.appAuthService.authState$;
  }

  async ngOnInit(): Promise<void> {
    await this.appAuthService.syncAuthState();
  }

  async onAuthAction(
    event: Event,
    isAuthenticated: boolean,
  ): Promise<void> {
    event.preventDefault();

    if (this.authActionInProgress) {
      return;
    }

    this.authActionInProgress = true;

    try {
      if (isAuthenticated) {
        await this.appAuthService.logout();
        return;
      }

      await this.appAuthService.login();
    } finally {
      this.authActionInProgress = false;
    }
  }
}
