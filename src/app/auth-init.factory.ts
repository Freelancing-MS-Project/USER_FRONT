import { AuthService } from './services/auth.service';

export function initializeAuth(authService: AuthService): () => Promise<void> {
  return () => authService.initialize();
}
