import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { DeductionPayload, DeductionRecord, StaffRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';

interface DeductionFormState {
  id: string | null;
  month: string;
  amount: number;
  reason: string;
  date: string;
}

@Component({
  selector: 'app-staff-deduction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './deduction-detail.html',
  styleUrls: ['../../products/catalog-detail.scss', '../staff.scss', './deduction-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDeductionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly staff = signal<StaffRecord | null>(null);
  readonly deductions = signal<DeductionRecord[]>([]);
  readonly month = signal(this.currentMonth());
  readonly deductionForm = signal<DeductionFormState>(this.emptyDeduction());
  readonly isDeductionModalOpen = signal(false);
  readonly isLoading = signal(true);
  readonly isBusy = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id') ?? '';
          if (!id) return of(null);
          this.isLoading.set(true);
          this.errorMessage.set('');
          return this.adminApi.getAdminStaffById(id);
        }),
      )
      .subscribe({
        next: (staff) => {
          this.staff.set(staff);
          if (staff) {
            this.loadDeductions();
          } else {
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || 'Unable to load staff details.');
          this.isLoading.set(false);
        },
      });
  }

  visibleDeductions(): DeductionRecord[] {
    const selectedMonth = this.month().trim();
    if (!selectedMonth) return this.deductions();
    return this.deductions().filter((deduction) => deduction.month?.startsWith(selectedMonth));
  }

  totalDeductions(): number {
    return this.visibleDeductions().reduce((sum, deduction) => sum + Number(deduction.amount ?? 0), 0);
  }

  setMonth(value: string): void {
    this.month.set(value);
    if (!this.deductionForm().id) {
      this.updateDeductionField('month', value);
    }
  }

  loadDeductions(): void {
    const staffId = this.id(this.staff());
    if (!staffId) return;

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.getDeductions(staffId).subscribe({
      next: (deductions) => {
        this.deductions.set(deductions);
        this.isBusy.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to load deductions.');
        this.isBusy.set(false);
        this.isLoading.set(false);
      },
    });
  }

  openCreateDeductionModal(): void {
    this.deductionForm.set(this.emptyDeduction());
    this.isDeductionModalOpen.set(true);
  }

  editDeduction(deduction: DeductionRecord): void {
    this.deductionForm.set({
      id: this.id(deduction),
      month: deduction.month,
      amount: Number(deduction.amount),
      reason: deduction.reason,
      date: deduction.date?.slice(0, 10) ?? '',
    });
    this.isDeductionModalOpen.set(true);
  }

  closeDeductionModal(): void {
    this.isDeductionModalOpen.set(false);
    this.deductionForm.set(this.emptyDeduction());
  }

  saveDeduction(): void {
    const staffId = this.id(this.staff());
    if (!staffId) return;

    const form = this.deductionForm();
    const payload: DeductionPayload = {
      month: form.month,
      amount: Number(form.amount),
      reason: form.reason.trim(),
      date: form.date,
    };

    this.isBusy.set(true);
    this.errorMessage.set('');

    const request = form.id
      ? this.adminApi.updateDeduction(staffId, form.id, payload)
      : this.adminApi.addDeduction(staffId, payload);

    request.subscribe({
      next: () => {
        this.toastService.success(
          form.id ? 'Deduction updated successfully.' : 'Deduction created successfully.',
        );
        this.closeDeductionModal();
        this.loadDeductions();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to save deduction.');
        this.toastService.error(this.errorMessage());
        this.isBusy.set(false);
      },
    });
  }

  deleteDeduction(deduction: DeductionRecord): void {
    const staffId = this.id(this.staff());
    if (!staffId) return;

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.deleteDeduction(staffId, this.id(deduction)).subscribe({
      next: () => {
        this.toastService.success('Deduction deleted successfully.');
        this.loadDeductions();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to delete deduction.');
        this.toastService.error(this.errorMessage());
        this.isBusy.set(false);
      },
    });
  }

  updateDeductionField<K extends keyof DeductionFormState>(key: K, value: DeductionFormState[K]): void {
    this.deductionForm.update((current) => ({ ...current, [key]: value }));
  }

  id(record: DeductionRecord | StaffRecord | null | undefined): string {
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

  joinDateLabel(record: StaffRecord | null | undefined): string {
    return record?.joinDate ? String(record.joinDate).slice(0, 10) : '--';
  }

  statusLabel(record: StaffRecord | null | undefined): string {
    return record?.isActive ? 'Active' : 'Inactive';
  }

  private emptyDeduction(): DeductionFormState {
    return {
      id: null,
      month: this.month(),
      amount: 0,
      reason: '',
      date: new Date().toISOString().slice(0, 10),
    };
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }
}
