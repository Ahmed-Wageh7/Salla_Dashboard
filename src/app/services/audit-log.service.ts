import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { UserRole } from '../core/auth/access-control.service';

export type AuditEntityType =
  | 'auth'
  | 'dashboard'
  | 'product'
  | 'category'
  | 'subcategory'
  | 'order'
  | 'staff'
  | 'attendance'
  | 'deduction'
  | 'salary';

export type AuditStatus = 'success' | 'warning' | 'error';

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  status: AuditStatus;
  actorName: string;
  actorRole: UserRole;
  timestamp: string;
  metadata?: Record<string, string | number | boolean | null>;
}

interface AuditLogInput {
  action: string;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
  status?: AuditStatus;
  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly storageKey = 'audit.logs';
  private readonly authService = inject(AuthService);
  private readonly entriesState = signal<AuditLogEntry[]>(this.readEntries());

  readonly entries = computed(() =>
    [...this.entriesState()].sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
  );

  log(input: AuditLogInput): AuditLogEntry {
    const metadata = {
      route: this.currentRoute(),
      source: 'admin-ui',
      ...(input.metadata ?? {}),
    };

    const entry: AuditLogEntry = {
      id: this.createId(),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId?.trim() || 'n/a',
      summary: input.summary.trim(),
      status: input.status ?? 'success',
      actorName: this.authService.displayName(),
      actorRole: this.authService.currentRole(),
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.entriesState.update((entries) => {
      const next = [entry, ...entries].slice(0, 300);
      this.persistEntries(next);
      return next;
    });

    return entry;
  }

  clear(): void {
    this.entriesState.set([]);
    this.persistEntries([]);
  }

  private readEntries(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];

    try {
      const parsed = JSON.parse(window.localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistEntries(entries: AuditLogEntry[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private currentRoute(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.hash || window.location.pathname || '/';
  }
}
