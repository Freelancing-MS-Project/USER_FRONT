import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { AppUser } from '../../models/users';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly usersService = inject(UsersService);

  readonly me$: Observable<AppUser | null> = this.usersService.getCurrentUser().pipe(
    catchError((error: unknown) => {
      console.error('Failed to load GET /api/users/me.', error);
      return of(null);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
