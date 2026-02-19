import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly backendApiPrefix = 'http://localhost:8082/api/';

  constructor(private readonly authService: AuthService) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    if (!this.shouldAttachToken(request.url)) {
      return next.handle(request);
    }

    const accessToken = this.authService.getToken();

    if (!accessToken) {
      this.authService.logout();
      return next.handle(request);
    }

    const authorizedRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return next.handle(authorizedRequest).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.authService.logout();
        }

        return throwError(() => error);
      }),
    );
  }

  private shouldAttachToken(url: string): boolean {
    return (
      url.startsWith(this.backendApiPrefix) ||
      url.startsWith('/api/') ||
      url.startsWith('api/')
    );
  }
}
