import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { StaffRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';

@Component({
  selector: 'app-staff-deductions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StaffWorkspaceNavComponent],
  templateUrl: './deductions.html',
  styleUrls: ['../staff.scss', '../members/members.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDeductionsComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly staffMembers = signal<StaffRecord[]>([]);
  readonly searchQuery = signal('');
  readonly month = signal(this.currentMonth());
  readonly isLoadingStaff = signal(true);
  readonly errorMessage = signal('');

  readonly filteredStaff = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.staffMembers();

    return this.staffMembers().filter((record) =>
      [
        this.id(record),
        this.userId(record),
        this.userName(record),
        this.userEmail(record),
        record.department,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  constructor() {
    this.loadStaffMembers();
  }

  loadStaffMembers(): void {
    this.isLoadingStaff.set(true);
    this.errorMessage.set('');

    this.adminApi.getAdminStaff().subscribe({
      next: (staff) => {
        this.staffMembers.set(
          [...staff].sort((left, right) => this.userName(left).localeCompare(this.userName(right))),
        );
        this.isLoadingStaff.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to load staff members.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isLoadingStaff.set(false);
      },
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  setMonth(value: string): void {
    this.month.set(value);
  }

  id(record: StaffRecord | null | undefined): string {
    if (!record) return '';
    return record._id ?? record.id ?? '';
  }

  userId(record: StaffRecord | null | undefined): string {
    const user = record?.user;
    if (!user) return '';
    return typeof user === 'string' ? user : user._id ?? user.id ?? '';
  }

  userName(record: StaffRecord | null | undefined): string {
    const user = record?.user;
    if (!user) return 'Unknown user';
    return typeof user === 'string' ? user : user.name?.trim() || user.email?.trim() || this.userId(record);
  }

  userEmail(record: StaffRecord | null | undefined): string {
    const user = record?.user;
    if (!user || typeof user === 'string') return '';
    return user.email ?? '';
  }

  statusLabel(record: StaffRecord | null | undefined): string {
    return record?.isActive ? 'Active' : 'Inactive';
  }

  joinDateLabel(record: StaffRecord | null | undefined): string {
    return record?.joinDate ? String(record.joinDate).slice(0, 10) : '--';
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private getApiErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const apiError = error as {
      error?: { message?: string; details?: string[] };
      message?: string;
    };

    return (
      apiError.error?.details?.join(' ') || apiError.error?.message || apiError.message || fallback
    );
  }
}
