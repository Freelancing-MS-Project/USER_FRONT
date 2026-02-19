import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { KeycloakService } from '../auth/keycloak.service';
import { UserSessionService } from '../auth/user-session.service';

export const roleGuard: CanActivateFn = async (route) => {
  const keycloakService = inject(KeycloakService);
  const userSessionService = inject(UserSessionService);
  const router = inject(Router);

  const requiredRoles = (route.data?.['roles'] as readonly string[] | undefined) ?? [];

  if (requiredRoles.length === 0) {
    return true;
  }

  try {
    await keycloakService.getValidAccessToken();
    userSessionService.syncFromToken();

    const userRoles = userSessionService.getRoles();
    const hasAllRequiredRoles = requiredRoles.every((role) =>
      userRoles.includes(role),
    );

    if (hasAllRequiredRoles) {
      return true;
    }

    return router.parseUrl('/dashboard');
  } catch (error: unknown) {
    console.error('RoleGuard failed.', error);
    return router.parseUrl('/dashboard');
  }
};
