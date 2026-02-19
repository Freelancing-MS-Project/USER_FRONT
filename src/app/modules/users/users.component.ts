import { Component, inject } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { AppUser } from '../../models/users';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent {
  private readonly usersService = inject(UsersService);

  readonly users$: Observable<readonly AppUser[]> = this.usersService.getUsers().pipe(
    catchError((error: unknown) => {
      console.error('Failed to load users list.', error);
      return of([] as const);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
