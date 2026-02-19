import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SECURITY_CONFIG } from '../core/config/security.config';
import { AppUser } from '../models/users';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly usersEndpoint = `${SECURITY_CONFIG.backendBaseUrl}/api/users`;

  getUsers(): Observable<readonly AppUser[]> {
    return this.http.get<readonly AppUser[]>(this.usersEndpoint);
  }

  getCurrentUser(): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.usersEndpoint}/me`);
  }
}
