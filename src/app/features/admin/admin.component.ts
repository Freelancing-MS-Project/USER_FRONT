import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { AppUser } from '../../models/users';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent {
  private readonly usersService = inject(UsersService);

  readonly users$: Observable<readonly AppUser[]> = this.usersService.getUsers().pipe(
    catchError((error: unknown) => {
      console.error('Failed to load GET /api/users.', error);
      return of([] as const);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
