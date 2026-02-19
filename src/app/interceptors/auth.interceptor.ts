import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { KeycloakService } from '../auth/keycloak.service';
import { SECURITY_CONFIG } from '../core/config/security.config';

const RETRY_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

function isApiRequest(url: string): boolean {
  const isAbsoluteUrl = /^https?:\/\//i.test(url);

  if (!isAbsoluteUrl) {
    return url.startsWith('/api') || url.startsWith('api/');
  }

  try {
    const requestUrl = new URL(url);
    const backendUrl = new URL(SECURITY_CONFIG.backendBaseUrl);
    return requestUrl.origin === backendUrl.origin;
  } catch {
    return false;
  }
}

async function withAuthorizationHeader(
  request: HttpRequest<unknown>,
  keycloakService: KeycloakService,
): Promise<HttpRequest<unknown>> {
  if (!isApiRequest(request.url)) {
    return request;
  }

  const token = await keycloakService.getValidAccessToken();

  if (!token) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const keycloakService = inject(KeycloakService);

  return from(withAuthorizationHeader(request, keycloakService)).pipe(
    switchMap((authorizedRequest) =>
      next(authorizedRequest).pipe(
        catchError((error: unknown) => {
          if (
            !(error instanceof HttpErrorResponse) ||
            error.status !== 401 ||
            !isApiRequest(request.url) ||
            authorizedRequest.context.get(RETRY_AFTER_REFRESH)
          ) {
            return throwError(() => error);
          }

          return from(keycloakService.forceRefreshToken()).pipe(
            switchMap((refreshedToken) => {
              if (!refreshedToken) {
                void keycloakService.logout();
                return throwError(() => error);
              }

              const retryRequest = authorizedRequest.clone({
                context: authorizedRequest.context.set(RETRY_AFTER_REFRESH, true),
                setHeaders: {
                  Authorization: `Bearer ${refreshedToken}`,
                },
              });

              return next(retryRequest);
            }),
            catchError((refreshError: unknown) => {
              void keycloakService.logout();
              return throwError(() => refreshError);
            }),
          );
        }),
      ),
    ),
  );
};
