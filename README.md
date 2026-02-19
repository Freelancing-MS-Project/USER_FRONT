# Prospera Frontend (Angular 18 + Keycloak 26)

This frontend implements an enterprise-ready authentication architecture for:

- Angular 18 (compatible with Angular 17 patterns)
- Keycloak 26.x (`prospera` realm, `prospera-client` client)
- Spring Boot OAuth2 Resource Server backend (`http://localhost:8082`)

## Security Architecture Summary

- Keycloak initialization happens before app startup through `APP_INITIALIZER`.
- OAuth2/OIDC login is fully delegated to Keycloak (`login-required`, PKCE `S256`).
- Access token is attached automatically by HTTP interceptor only for backend API calls.
- 401 responses trigger one refresh/retry attempt before logout fallback.
- Roles are resolved from `tokenParsed.realm_access.roles`.
- Route security is enforced with `AuthGuard` and `RoleGuard`.
- User session state is centralized in `UserSessionService` with `BehaviorSubject`.

## Project Structure

```text
src/app
  core/
    config/security.config.ts
  auth/
    keycloak.service.ts
    keycloak.initializer.ts
    user-session.service.ts
  guards/
    auth.guard.ts
    role.guard.ts
  interceptors/
    auth.interceptor.ts
  services/
    users.service.ts
  shared/
    components/
      auth-navbar/
      login-button/
      logout-button/
  features/
    public/
    dashboard/
    admin/
```

## Login Flow

1. Angular starts.
2. `APP_INITIALIZER` executes `KeycloakService.init()` before app bootstrap.
3. Keycloak JS redirects to Keycloak login if user is not authenticated.
4. On successful login, user returns with tokens in memory and app renders.

Key settings in `src/app/core/config/security.config.ts`:

- `url: http://localhost:8080`
- `realm: prospera`
- `clientId: prospera-client`
- `onLoad: 'login-required'`
- `checkLoginIframe: false`
- `pkceMethod: 'S256'`

## Logout Flow

- `UserSessionService.logout()` delegates to `KeycloakService.logout()`.
- Keycloak session is terminated and browser redirects to `/public`.
- In-memory token/session state is cleared.

## Role-Based Security

- `AuthGuard` protects authenticated routes (example: `/dashboard`).
- `RoleGuard` enforces realm roles (example: `/admin` requires `ADMIN`).
- Roles are extracted from `tokenParsed.realm_access.roles`.

## Token Lifecycle

- Tokens are held in memory by `keycloak-js` (no manual localStorage usage).
- `KeycloakService` handles:
  - Scheduled refresh loop
  - Refresh on token expiration callback
  - On-demand refresh for API requests
- Interceptor retries once on `401` after forced refresh.
- If refresh fails, logout is triggered to avoid invalid session drift.

## Backend Integration Examples

Implemented in `src/app/services/users.service.ts`:

- `getUsers()` -> `GET http://localhost:8082/api/users`
- `getCurrentUser()` -> `GET http://localhost:8082/api/users/me`

UI examples:

- `/dashboard` loads `getCurrentUser()`
- `/admin` loads `getUsers()` (ADMIN-only)
- `/users` module also demonstrates `getUsers()`

## Routing Security Example

Defined in `src/app/app-routing.module.ts`:

- `/public` -> open route in app navigation
- `/dashboard` -> `canActivate: [authGuard]`
- `/admin` -> `canActivate: [authGuard, roleGuard]` with `data.roles = ['ADMIN']`

## Security Best Practices Applied

- No password handling in Angular.
- Keycloak-hosted login page only.
- No manual token persistence to localStorage/sessionStorage.
- Stateless frontend-to-backend authorization via bearer token.
- Separation of concerns: auth/session/guards/interceptor/services/features.

## Local Test Run (Keycloak + Backend)

1. Start Keycloak at `http://localhost:8080`.
2. Ensure realm/client exist:
  - Realm: `prospera`
  - Client: `prospera-client`
  - Public client with standard flow + PKCE (S256)
  - Valid redirect URI includes `http://localhost:4200/*`
3. Start backend resource server at `http://localhost:8082`.
4. Run frontend:

```bash
npm install
npm start
```

5. Open `http://localhost:4200`.
6. Authenticate via Keycloak.
7. Validate:
  - `/dashboard` works for authenticated user
  - `/admin` only works when token has `ADMIN` role
  - API calls include bearer token automatically
