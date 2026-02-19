export interface SecurityConfiguration {
  readonly backendBaseUrl: string;
  readonly keycloakBaseUrl: string;
  readonly keycloakRealm: string;
  readonly keycloakClientId: string;
  readonly keycloakTokenEndpoint: string;
}

export const SECURITY_CONFIG: SecurityConfiguration = {
  backendBaseUrl: 'http://localhost:8082',
  keycloakBaseUrl: 'http://localhost:8080',
  keycloakRealm: 'prospera',
  keycloakClientId: 'prospera-client',
  keycloakTokenEndpoint:
    'http://localhost:8080/realms/prospera/protocol/openid-connect/token',
};
