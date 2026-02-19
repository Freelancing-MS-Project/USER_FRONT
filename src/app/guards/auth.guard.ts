import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AppAuthService } from '../services/keycloak.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private readonly appAuthService: AppAuthService,
    private readonly router: Router,
  ) {}

  async canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean | UrlTree> {
    await this.appAuthService.syncAuthState();

    if (this.appAuthService.isLoggedIn()) {
      return true;
    }

    return this.router.createUrlTree(['/home'], {
      queryParams: { returnUrl: state.url },
    });
  }
}
