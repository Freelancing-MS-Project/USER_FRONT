import { APP_INITIALIZER, Provider } from '@angular/core';

import { KeycloakService } from './keycloak.service';
import { UserSessionService } from './user-session.service';

async function initializeKeycloak(
  keycloakService: KeycloakService,
  userSessionService: UserSessionService,
): Promise<void> {
  await keycloakService.init();
  userSessionService.syncFromToken();
}

export function provideKeycloakInitializer(): Provider {
  return {
    provide: APP_INITIALIZER,
    multi: true,
    useFactory: (
      keycloakService: KeycloakService,
      userSessionService: UserSessionService,
    ) => {
      return () => initializeKeycloak(keycloakService, userSessionService);
    },
    deps: [KeycloakService, UserSessionService],
  };
}
