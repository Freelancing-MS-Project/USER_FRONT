import { HttpRequest } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';

const BACKEND_BASE_URL = 'http://localhost:8082';

function shouldAttachToken(request: HttpRequest<unknown>): boolean {
  const isAbsoluteUrl = /^https?:\/\//i.test(request.url);

  if (!isAbsoluteUrl) {
    return request.url.startsWith('/api') || request.url.startsWith('api/');
  }

  return request.url.startsWith(BACKEND_BASE_URL);
}

export function initializeKeycloak(
  keycloak: KeycloakService,
): () => Promise<boolean> {
  return () =>
    keycloak.init({
      config: {
        url: 'http://localhost:8080',
        realm: 'prospera',
        clientId: 'prospera-client',
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false,
        pkceMethod: 'S256',
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html',
      },
      shouldAddToken: shouldAttachToken,
      bearerExcludedUrls: ['/assets'],
    });
}
