import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import {
  StaffPayload,
  StaffRecord,
  StaffUpdatePayload,
  StaffUserRecord,
} from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';

interface StaffFormState {
  id: string | null;
  user: string;
  dailySalary: string;
  joinDate: string;
  department: string;
  isActive: boolean;
}

@Component({
  selector: 'app-staff-members',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StaffWorkspaceNavComponent],
  templateUrl: './members.html',
  styleUrls: ['../staff.scss', './members.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMembersComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly staffMembers = signal<StaffRecord[]>([]);
  readonly searchQuery = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly isFormModalOpen = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly form = signal<StaffFormState>(this.emptyForm());

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
        record.joinDate,
        record.dailySalary,
        record.isActive ? 'active' : 'inactive',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  constructor() {
    this.loadStaff();
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminApi.getAdminStaff().subscribe({
      next: (staff) => {
        const sorted = [...staff].sort((left, right) =>
          this.userName(left).localeCompare(this.userName(right)),
        );

        this.staffMembers.set(sorted);
        this.isLoading.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to load staff members.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isLoading.set(false);
      },
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  openCreateModal(): void {
    this.errorMessage.set('');
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(true);
  }

  openEditModal(record: StaffRecord): void {
    this.form.set({
      id: this.id(record),
      user: this.userId(record),
      dailySalary: String(record.dailySalary ?? ''),
      joinDate: record.joinDate ? String(record.joinDate).slice(0, 10) : '',
      department: record.department ?? '',
      isActive: !!record.isActive,
    });
    this.errorMessage.set('');
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.form.set(this.emptyForm());
    this.isFormModalOpen.set(false);
  }

  updateForm<K extends keyof StaffFormState>(key: K, value: StaffFormState[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  saveStaff(): void {
    const form = this.form();
    const dailySalary = Number(form.dailySalary);

    if (!form.id && !form.user.trim()) {
      const message = 'User ID is required when creating a staff record.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    if (!Number.isFinite(dailySalary) || dailySalary < 0) {
      const message = 'Daily salary must be a valid number.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    if (!form.joinDate.trim() || !form.department.trim()) {
      const message = 'Join date and department are required.';
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const createPayload: StaffPayload = {
      user: form.user.trim(),
      dailySalary,
      joinDate: form.joinDate.trim(),
      department: form.department.trim(),
      isActive: form.isActive,
    };

    const updatePayload: StaffUpdatePayload = {
      dailySalary,
      joinDate: form.joinDate.trim(),
      department: form.department.trim(),
      isActive: form.isActive,
    };

    const request = form.id
      ? this.adminApi.updateStaff(form.id, updatePayload)
      : this.adminApi.createStaff(createPayload);

    request.subscribe({
      next: (record) => {
        this.syncStaffRecord(record);
        this.toastService.success(
          form.id ? 'Staff updated successfully.' : 'Staff created successfully.',
        );
        this.closeFormModal();
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to save staff record.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isSaving.set(false);
      },
    });
  }

  requestDelete(record: StaffRecord): void {
    this.pendingDeleteId.set(this.id(record));
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.pendingDeleteId.set(null);
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.adminApi.deleteStaff(id).subscribe({
      next: () => {
        this.staffMembers.update((records) => records.filter((record) => this.id(record) !== id));
        this.toastService.success('Staff deleted successfully.');
        this.closeDeleteModal();
        this.isDeleting.set(false);
      },
      error: (error) => {
        const message = this.getApiErrorMessage(error, 'Unable to delete staff record.');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isDeleting.set(false);
      },
    });
  }

  pendingDeleteStaff(): StaffRecord | undefined {
    return this.staffMembers().find((record) => this.id(record) === this.pendingDeleteId());
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

  userObject(record: StaffRecord | null | undefined): StaffUserRecord | null {
    const user = record?.user;
    return user && typeof user !== 'string' ? user : null;
  }

  statusLabel(record: StaffRecord | null | undefined): string {
    return record?.isActive ? 'Active' : 'Inactive';
  }

  joinDateLabel(record: StaffRecord | null | undefined): string {
    return record?.joinDate ? String(record.joinDate).slice(0, 10) : '--';
  }

  private syncStaffRecord(record: StaffRecord): void {
    const recordId = this.id(record);
    const merged = [...this.staffMembers()];
    const existingIndex = merged.findIndex((entry) => this.id(entry) === recordId);

    if (existingIndex >= 0) {
      merged[existingIndex] = record;
    } else {
      merged.unshift(record);
    }

    merged.sort((left, right) => this.userName(left).localeCompare(this.userName(right)));
    this.staffMembers.set(merged);
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

  private emptyForm(): StaffFormState {
    return {
      id: null,
      user: '',
      dailySalary: '',
      joinDate: '',
      department: '',
      isActive: true,
    };
  }
}
