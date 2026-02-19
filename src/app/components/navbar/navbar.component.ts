import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { AuthService, AuthState } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  readonly authState$: Observable<AuthState>;

  authActionInProgress = false;
  errorMessage: string | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.authState$ = this.authService.authState$;
  }

  async ngOnInit(): Promise<void> {
    this.authService.syncAuthState();
  }

  async onAuthAction(
    event: Event,
    isAuthenticated: boolean,
  ): Promise<void> {
    event.preventDefault();
    this.errorMessage = null;

    if (this.authActionInProgress) {
      return;
    }

    this.authActionInProgress = true;

    try {
      if (isAuthenticated) {
        this.authService.logout();
        return;
      }

      const username = window.prompt('Email');

      if (!username || username.trim().length === 0) {
        return;
      }

      const password = window.prompt('Mot de passe');

      if (!password || password.length === 0) {
        return;
      }

      await firstValueFrom(this.authService.login(username.trim(), password));

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

      if (returnUrl) {
        await this.router.navigateByUrl(returnUrl);
      }
    } catch {
      this.errorMessage = 'Email ou mot de passe incorrect';
    } finally {
      this.authActionInProgress = false;
    }
  }
}
