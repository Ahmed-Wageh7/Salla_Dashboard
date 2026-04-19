import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<void> {
    return this.http.post<unknown>(this.url('/auth/login'), payload).pipe(
      map((response) => this.extractToken(response)),
      tap((token) => this.storeToken(token)),
      map(() => undefined),
    );
  }

  logout(): void {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string {
    if (typeof window === 'undefined') return '';

    return (
      window.localStorage.getItem('auth_token') ||
      window.localStorage.getItem('access_token') ||
      window.localStorage.getItem('token') ||
      ''
    );
  }

  private storeToken(token: string): void {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem('auth_token', token);
  }

  private extractToken(response: unknown): string {
    const candidates = this.collectStringCandidates(response);
    const token = candidates.find((value) => value.length > 20);

    if (!token) {
      throw new Error('Login succeeded but no token was returned.');
    }

    return token;
  }

  private collectStringCandidates(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (!value || typeof value !== 'object') return [];

    const objectValue = value as Record<string, unknown>;
    const keys = ['token', 'accessToken', 'authToken', 'jwt'];
    const directMatches = keys
      .map((key) => objectValue[key])
      .filter((entry): entry is string => typeof entry === 'string' && !!entry.trim())
      .map((entry) => entry.trim());

    const nestedMatches = ['data', 'result', 'user', 'payload', 'tokens']
      .map((key) => objectValue[key])
      .flatMap((entry) => this.collectStringCandidates(entry));

    return [...directMatches, ...nestedMatches];
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
