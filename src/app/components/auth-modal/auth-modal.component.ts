import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService, RegisterRequest } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.css',
})
export class AuthModalComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() activeTab: 'login' | 'register' = 'login';

  @Output() closed = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  isSubmitting = false;
  errorMessage: string | null = null;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly registerForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    cin: ['', [Validators.required, Validators.minLength(6)]],
    role: ['Client', [Validators.required]],
  });

  constructor(private readonly authService: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.errorMessage = null;
    }
  }

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.errorMessage = null;
  }

  closeModal(): void {
    if (this.isSubmitting) {
      return;
    }

    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir les champs de connexion correctement.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.loginForm.reset();
          this.authenticated.emit();
          this.closed.emit();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveLoginError(error);
        },
      });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = this.getRegisterValidationMessage();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const formValue = this.registerForm.getRawValue();
    const payload: RegisterRequest = {
      email: formValue.email,
      password: formValue.password,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      cin: formValue.cin,
      role: formValue.role === 'Freelancer' ? 'Freelancer' : 'Client',
    };

    this.authService
      .register(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.registerForm.reset({
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            cin: '',
            role: 'Client',
          });
          this.authenticated.emit();
          this.closed.emit();
        },
        error: (error: unknown) => {
          this.errorMessage = this.resolveRegisterError(error);
        },
      });
  }

  private resolveLoginError(error: unknown): string {
    if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
      return 'Email ou mot de passe incorrect';
    }

    if (error instanceof Error && error.message === 'LOGIN_UNAVAILABLE') {
      return 'Connexion impossible: serveur Keycloak ou backend indisponible.';
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Connexion impossible: vérifie que Keycloak et le backend sont lancés.';
    }

    return 'Connexion impossible pour le moment.';
  }

  private resolveRegisterError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return 'Inscription créée, mais connexion automatique impossible. Connecte-toi via l’onglet Login.';
      }

      if (error.message === 'LOGIN_UNAVAILABLE') {
        return 'Inscription créée, mais Keycloak est indisponible pour la connexion automatique.';
      }
    }

    if (error instanceof HttpErrorResponse) {
      const backendDetail = this.extractBackendDetail(error);

      if (error.status === 409) {
        return 'Cet email existe déjà.';
      }

      if (error.status === 400) {
        return backendDetail ?? 'Inscription refusée: vérifie les données saisies.';
      }

      if (error.status === 401 || error.status === 403) {
        return backendDetail ?? 'Inscription refusée: accès non autorisé au endpoint register.';
      }

      if (error.status === 404) {
        return 'Endpoint introuvable: vérifie l’URL backend /api/users/register.';
      }

      if (error.status >= 500) {
        return backendDetail ?? 'Erreur serveur pendant l’inscription.';
      }

      if (error.status === 0) {
        return 'Inscription impossible: backend indisponible ou CORS bloqué (vérifie le proxy Angular et le serveur Spring Boot).';
      }

      if (backendDetail) {
        return backendDetail;
      }

      return `Inscription impossible (HTTP ${error.status}).`;
    }

    return 'Inscription impossible. Vérifie les informations saisies.';
  }

  private extractBackendDetail(error: HttpErrorResponse): string | null {
    const payload = error.error;

    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload.trim();
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const objectPayload = payload as Record<string, unknown>;

    const messageKeys = [
      'message',
      'error',
      'error_description',
      'detail',
      'title',
    ];

    for (const key of messageKeys) {
      const value = objectPayload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    const errors = objectPayload['errors'];
    if (Array.isArray(errors) && errors.length > 0) {
      const firstError = errors[0];
      if (typeof firstError === 'string' && firstError.trim().length > 0) {
        return firstError.trim();
      }
    }

    return null;
  }

  private getRegisterValidationMessage(): string {
    const controls = this.registerForm.controls;

    if (controls.email.errors?.['required']) {
      return 'Email requis.';
    }

    if (controls.email.errors?.['email']) {
      return 'Format email invalide.';
    }

    if (controls.password.errors?.['required']) {
      return 'Mot de passe requis.';
    }

    if (controls.password.errors?.['minlength']) {
      return 'Le mot de passe doit contenir au moins 4 caractères.';
    }

    if (controls.firstName.errors?.['required']) {
      return 'Prénom requis.';
    }

    if (controls.firstName.errors?.['minlength']) {
      return 'Le prénom doit contenir au moins 2 caractères.';
    }

    if (controls.lastName.errors?.['required']) {
      return 'Nom requis.';
    }

    if (controls.lastName.errors?.['minlength']) {
      return 'Le nom doit contenir au moins 2 caractères.';
    }

    if (controls.cin.errors?.['required']) {
      return 'CIN requis.';
    }

    if (controls.cin.errors?.['minlength']) {
      return 'Le CIN doit contenir au moins 6 caractères.';
    }

    if (controls.role.errors?.['required']) {
      return 'Rôle requis.';
    }

    return 'Formulaire invalide.';
  }
}
