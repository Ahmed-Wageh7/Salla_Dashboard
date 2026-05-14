import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Permission, UserRole } from './access-control.service';

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthSession {
  token: string;
  role: UserRole;
  permissions: Permission[];
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionKey = 'auth_session';
  private expiryTimeoutId: number | null = null;
  readonly session = signal<AuthSession | null>(this.readStoredSession());

  constructor() {
    this.syncSessionExpiry(this.session());
  }

  login(payload: LoginPayload): Observable<void> {
    return this.http.post<unknown>(this.url('/auth/login'), payload).pipe(
      tap((response) => this.persistSession(this.extractSession(response))),
      map(() => undefined),
    );
  }

  logout(): void {
    this.clearSession();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string {
    const sessionToken = this.session()?.token?.trim();
    if (sessionToken) {
      if (this.isTokenExpired(sessionToken)) {
        this.handleExpiredSession();
        return '';
      }

      return sessionToken;
    }
    if (typeof window === 'undefined') return '';

    const storedToken =
      window.localStorage.getItem('auth_token') ||
      window.localStorage.getItem('access_token') ||
      window.localStorage.getItem('token') ||
      '';

    if (storedToken && this.isTokenExpired(storedToken)) {
      this.handleExpiredSession();
      return '';
    }

    return storedToken;
  }

  currentRole(): UserRole {
    return this.session()?.role ?? this.inferRoleFromToken(this.getToken()) ?? 'user';
  }

  currentPermissions(): Permission[] {
    return this.session()?.permissions ?? [];
  }

  displayName(): string {
    return this.session()?.name || this.session()?.email || 'Admin user';
  }

  private persistSession(session: AuthSession): void {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem('auth_token', session.token);
    window.localStorage.setItem(this.sessionKey, JSON.stringify(session));
    this.session.set(session);
    this.syncSessionExpiry(session);
  }

  private extractSession(response: unknown): AuthSession {
    const token = this.extractToken(response);
    const payload = this.decodeTokenPayload(token);
    const profile = this.findProfile(response);

    return {
      token,
      role: this.normalizeRole(
        profile?.role ?? payload?.['role'] ?? payload?.['userRole'] ?? this.firstRole(payload?.['roles']),
      ),
      permissions: this.normalizePermissions(
        profile?.permissions ?? payload?.['permissions'] ?? payload?.['scopes'],
      ),
      name: profile?.name ?? String(payload?.['name'] ?? payload?.['username'] ?? 'Admin user'),
      email: profile?.email ?? String(payload?.['email'] ?? ''),
    };
  }

  private extractToken(response: unknown): string {
    const candidates = this.collectStringCandidates(response);
    const token = candidates.find((value) => value.length > 20);

    if (!token) {
      throw new Error('Login succeeded but no token was returned.');
    }

    return token;
  }

  private readStoredSession(): AuthSession | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(this.sessionKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      if (!parsed?.token) return null;
      if (this.isTokenExpired(parsed.token)) {
        this.clearStoredSession();
        return null;
      }

      return {
        token: parsed.token,
        role: this.normalizeRole(parsed.role),
        permissions: this.normalizePermissions(parsed.permissions),
        name: parsed.name?.trim() || 'Admin user',
        email: parsed.email?.trim() || '',
      };
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    this.clearExpiryTimeout();
    this.clearStoredSession();
    this.session.set(null);
  }

  private handleExpiredSession(): void {
    this.clearSession();

    if (typeof window === 'undefined' || window.location.hash.includes('/login')) {
      return;
    }

    void this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private syncSessionExpiry(session: AuthSession | null): void {
    this.clearExpiryTimeout();
    if (!session) return;

    const expiration = this.getTokenExpiration(session.token);
    if (!expiration) return;

    const msUntilExpiry = expiration * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      this.handleExpiredSession();
      return;
    }

    this.expiryTimeoutId = window.setTimeout(() => this.handleExpiredSession(), msUntilExpiry);
  }

  private clearExpiryTimeout(): void {
    if (this.expiryTimeoutId === null) return;

    clearTimeout(this.expiryTimeoutId);
    this.expiryTimeoutId = null;
  }

  private clearStoredSession(): void {
    if (typeof window === 'undefined') return;

    window.localStorage.removeItem('auth_token');
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('token');
    window.localStorage.removeItem(this.sessionKey);
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

  private findProfile(
    value: unknown,
  ): { role?: unknown; permissions?: unknown; name?: string; email?: string } | null {
    if (!value || typeof value !== 'object') return null;

    const objectValue = value as Record<string, unknown>;
    const role = objectValue['role'] ?? objectValue['userRole'];
    const permissions = objectValue['permissions'] ?? objectValue['scopes'];
    const name = typeof objectValue['name'] === 'string' ? objectValue['name'] : undefined;
    const email = typeof objectValue['email'] === 'string' ? objectValue['email'] : undefined;

    if (role || permissions || name || email) {
      return { role, permissions, name, email };
    }

    for (const key of ['user', 'profile', 'data', 'result', 'payload']) {
      const nested = this.findProfile(objectValue[key]);
      if (nested) return nested;
    }

    return null;
  }

  private decodeTokenPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length < 2 || typeof atob === 'undefined') return null;

    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getTokenExpiration(token: string): number | null {
    const exp = this.decodeTokenPayload(token)?.['exp'];
    const expiration = typeof exp === 'number' ? exp : Number(exp);

    return Number.isFinite(expiration) && expiration > 0 ? expiration : null;
  }

  private isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration !== null && expiration * 1000 <= Date.now();
  }

  private inferRoleFromToken(token: string): UserRole | null {
    const payload = this.decodeTokenPayload(token);
    if (!payload) return null;

    return this.normalizeRole(
      payload['role'] ?? payload['userRole'] ?? this.firstRole(payload['roles']),
      false,
    );
  }

  private firstRole(value: unknown): unknown {
    return Array.isArray(value) ? value[0] : undefined;
  }

  private normalizeRole(value: unknown, fallbackToUser = true): UserRole {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['owner', 'super-admin', 'superadmin', 'admin'].includes(normalized)) return 'admin';
    if (['staff', 'agent', 'viewer'].includes(normalized)) return 'staff';
    if (['manager', 'editor', 'supervisor', 'user'].includes(normalized)) return 'user';
    return fallbackToUser ? 'user' : 'staff';
  }

  private normalizePermissions(value: unknown): Permission[] {
    const list = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [];

    return list
      .map((entry) => String(entry).trim())
      .filter(Boolean) as Permission[];
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
