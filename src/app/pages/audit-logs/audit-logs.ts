import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogEntry, AuditLogService } from '../../services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent {
  private readonly auditLogService = inject(AuditLogService);
  private readonly pageSize = 12;

  readonly searchQuery = signal('');
  readonly entityFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly roleFilter = signal('all');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly currentPage = signal(1);
  readonly expandedId = signal('');
  readonly logs = this.auditLogService.entries;

  readonly filteredLogs = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const entityFilter = this.entityFilter();
    const statusFilter = this.statusFilter();
    const roleFilter = this.roleFilter();
    const dateFrom = this.dateFrom();
    const dateTo = this.dateTo();

    return this.logs().filter((entry) => {
      const matchesEntity = entityFilter === 'all' || entry.entityType === entityFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesRole = roleFilter === 'all' || entry.actorRole === roleFilter;
      const matchesDateFrom = !dateFrom || entry.timestamp.slice(0, 10) >= dateFrom;
      const matchesDateTo = !dateTo || entry.timestamp.slice(0, 10) <= dateTo;
      const matchesQuery =
        !query ||
        [
          entry.action,
          entry.summary,
          entry.entityType,
          entry.entityId,
          entry.actorName,
          entry.actorRole,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return (
        matchesEntity &&
        matchesStatus &&
        matchesRole &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesQuery
      );
    });
  });

  readonly entityOptions = computed(() =>
    ['all', ...new Set(this.logs().map((entry) => entry.entityType))].sort(),
  );
  readonly roleOptions = computed(() =>
    ['all', ...new Set(this.logs().map((entry) => entry.actorRole))].sort(),
  );
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLogs().length / this.pageSize)),
  );
  readonly paginatedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredLogs().slice(start, start + this.pageSize);
  });
  readonly visibleRange = computed(() => {
    const total = this.filteredLogs().length;
    if (!total) return { start: 0, end: 0 };
    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return { start, end };
  });
  readonly paginationItems = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 1, total - 3));
    const end = Math.min(total, start + 3);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  readonly statusSummary = computed(() => {
    const logs = this.logs();
    return {
      total: logs.length,
      success: logs.filter((entry) => entry.status === 'success').length,
      warning: logs.filter((entry) => entry.status === 'warning').length,
      error: logs.filter((entry) => entry.status === 'error').length,
    };
  });

  constructor() {
    effect(() => {
      const page = this.currentPage();
      const totalPages = this.totalPages();
      if (page > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  clearLogs(): void {
    this.auditLogService.clear();
    this.currentPage.set(1);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  updateEntityFilter(value: string): void {
    this.entityFilter.set(value);
    this.currentPage.set(1);
  }

  updateStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  updateRoleFilter(value: string): void {
    this.roleFilter.set(value);
    this.currentPage.set(1);
  }

  updateDateFrom(value: string): void {
    this.dateFrom.set(value);
    this.currentPage.set(1);
  }

  updateDateTo(value: string): void {
    this.dateTo.set(value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.entityFilter.set('all');
    this.statusFilter.set('all');
    this.roleFilter.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.currentPage.set(1);
  }

  toggleExpanded(id: string): void {
    this.expandedId.update((current) => (current === id ? '' : id));
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  metadataEntries(entry: AuditLogEntry): Array<[string, string | number | boolean | null]> {
    return Object.entries(entry.metadata ?? {});
  }

  exportLogs(): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([JSON.stringify(this.filteredLogs(), null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.json';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  formatTimestamp(entry: AuditLogEntry): string {
    return new Date(entry.timestamp).toLocaleString();
  }
}
