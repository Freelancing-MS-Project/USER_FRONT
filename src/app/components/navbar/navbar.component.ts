import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';

import { AuthService, AuthState } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  readonly authState$: Observable<AuthState>;

  isAuthModalOpen = false;
  authModalTab: 'login' | 'register' = 'login';

  private queryParamsSubscription: Subscription | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    this.authState$ = this.authService.authState$;
  }

  ngOnInit(): void {
    this.authService.syncAuthState();

    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const shouldRequireAuth = params.get('authRequired') === '1';

      if (shouldRequireAuth && !this.authService.isAuthenticated()) {
        this.openAuthModal('login');
      }
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
  }

  openAuthModal(tab: 'login' | 'register' = 'login'): void {
    this.authModalTab = tab;
    this.isAuthModalOpen = true;
  }

  closeAuthModal(): void {
    this.isAuthModalOpen = false;
  }

  onAuthenticated(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigate([], {
      queryParams: { authRequired: null, returnUrl: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onLogout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
  }
}
