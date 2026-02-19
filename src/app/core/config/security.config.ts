import type { KeycloakConfig, KeycloakInitOptions } from 'keycloak-js';

export interface SecurityConfiguration {
  readonly backendBaseUrl: string;
  readonly keycloak: KeycloakConfig;
  readonly keycloakInitOptions: KeycloakInitOptions;
  readonly tokenRefreshIntervalMs: number;
  readonly minTokenValiditySeconds: number;
}

export const SECURITY_CONFIG: SecurityConfiguration = {
  backendBaseUrl: 'http://localhost:8082',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'prospera',
    clientId: 'prospera-client',
  },
  keycloakInitOptions: {
    onLoad: 'login-required',
    checkLoginIframe: false,
    pkceMethod: 'S256',
  },
  tokenRefreshIntervalMs: 10_000,
  minTokenValiditySeconds: 30,
};
