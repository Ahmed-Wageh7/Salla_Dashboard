import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { DeductionPayload, DeductionRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';

interface DeductionFormState {
  id: string | null;
  month: string;
  amount: number;
  reason: string;
  date: string;
}

@Component({
  selector: 'app-staff-deductions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, StaffWorkspaceNavComponent],
  templateUrl: './deductions.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffDeductionsComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly staffId = signal('');
  readonly month = signal(this.currentMonth());
  readonly deductions = signal<DeductionRecord[]>([]);
  readonly deductionForm = signal<DeductionFormState>(this.emptyDeduction());
  readonly isDeductionModalOpen = signal(false);
  readonly isBusy = signal(false);
  readonly feedback = signal('');
  readonly errorMessage = signal('');

  readonly visibleDeductions = computed(() => {
    const selectedMonth = this.month().trim();
    if (!selectedMonth) return this.deductions();

    return this.deductions().filter((deduction) => deduction.month?.startsWith(selectedMonth));
  });

  readonly totalDeductions = computed(() =>
    this.visibleDeductions().reduce((sum, deduction) => sum + Number(deduction.amount ?? 0), 0),
  );

  loadDeductions(): void {
    const staffId = this.staffId().trim();
    if (!staffId) {
      this.errorMessage.set('Enter a staff ID before loading deductions.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.getDeductions(staffId).subscribe({
      next: (deductions) => {
        this.deductions.set(deductions);
        this.feedback.set(
          `Loaded ${deductions.length} deduction${deductions.length === 1 ? '' : 's'}.`,
        );
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to load deductions.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }

  saveDeduction(): void {
    const staffId = this.staffId().trim();
    if (!staffId) {
      this.errorMessage.set('Enter a staff ID before saving deductions.');
      return;
    }

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
        const message = form.id
          ? 'Deduction updated successfully.'
          : 'Deduction created successfully.';
        this.feedback.set(message);
        this.toastService.success(message);
        this.closeDeductionModal();
        this.loadDeductions();
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to save deduction.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
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

  deleteDeduction(deduction: DeductionRecord): void {
    const staffId = this.staffId().trim();
    if (!staffId) {
      this.errorMessage.set('Enter a staff ID before deleting deductions.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.deleteDeduction(staffId, this.id(deduction)).subscribe({
      next: () => {
        this.feedback.set('Deduction deleted successfully.');
        this.toastService.success('Deduction deleted successfully.');
        this.loadDeductions();
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to delete deduction.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }

  resetDeductionForm(): void {
    this.deductionForm.set(this.emptyDeduction());
  }

  openCreateDeductionModal(): void {
    this.errorMessage.set('');
    this.feedback.set('');
    this.deductionForm.set(this.emptyDeduction());
    this.isDeductionModalOpen.set(true);
  }

  closeDeductionModal(): void {
    this.isDeductionModalOpen.set(false);
    this.resetDeductionForm();
  }

  setMonth(value: string): void {
    this.month.set(value);

    if (!this.deductionForm().id) {
      this.updateDeductionField('month', value);
    }
  }

  updateDeductionField<K extends keyof DeductionFormState>(
    key: K,
    value: DeductionFormState[K],
  ): void {
    this.deductionForm.update((current) => ({ ...current, [key]: value }));
  }

  id(record: DeductionRecord): string {
    return record._id ?? record.id ?? '';
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
