import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { SalaryAdjustmentPayload, SalaryRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';

@Component({
  selector: 'app-staff-salary',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonPipe, RouterModule, StaffWorkspaceNavComponent],
  templateUrl: './salary.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSalaryComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly staffId = signal('');
  readonly month = signal(this.currentMonth());
  readonly salary = signal<SalaryRecord | null>(null);
  readonly adjustmentAmount = signal(0);
  readonly adjustmentReason = signal('');
  readonly isBusy = signal(false);
  readonly feedback = signal('');
  readonly errorMessage = signal('');

  readonly baseSalary = computed(() => this.numberValue('baseSalary', 'amount', 'total'));
  readonly totalDeductions = computed(() => this.numberValue('deductions'));
  readonly netSalary = computed(() => this.numberValue('netSalary', 'total', 'amount'));
  readonly salaryStatus = computed(() => {
    const salary = this.salary();
    if (!salary) return 'Not loaded';
    if (salary.paid === true) return 'Paid';

    const rawStatus = String(salary['status'] ?? '').toLowerCase();
    return rawStatus === 'paid' ? 'Paid' : 'Pending';
  });

  loadSalary(): void {
    const staffId = this.staffId().trim();
    const month = this.month().trim();

    if (!staffId || !month) {
      this.errorMessage.set('Enter a staff ID and month before loading salary.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.getSalary(staffId, month).subscribe({
      next: (salary) => {
        this.salary.set(salary);
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to load salary details.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }

  paySalary(): void {
    const staffId = this.staffId().trim();
    const month = this.month().trim();

    if (!staffId || !month) {
      this.errorMessage.set('Enter a staff ID and month before paying salary.');
      return;
    }

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.paySalary(staffId, month).subscribe({
      next: (salary) => {
        this.salary.set({
          ...(this.salary() ?? {}),
          ...(salary ?? {}),
          paid: true,
        });
        this.feedback.set('Salary payment sent successfully.');
        this.toastService.success('Salary payment sent successfully.');
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to pay salary.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }

  adjustSalary(): void {
    const staffId = this.staffId().trim();
    const month = this.month().trim();

    if (!staffId || !month) {
      this.errorMessage.set('Enter a staff ID and month before adjusting salary.');
      return;
    }

    const payload: SalaryAdjustmentPayload = {
      amount: Number(this.adjustmentAmount()),
      reason: this.adjustmentReason().trim(),
    };

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.adjustSalary(staffId, month, payload).subscribe({
      next: (salary) => {
        this.salary.set({
          ...(this.salary() ?? {}),
          ...(salary ?? {}),
        });
        this.feedback.set('Salary adjusted successfully.');
        this.toastService.success('Salary adjusted successfully.');
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'Unable to adjust salary.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }

  private numberValue(...keys: string[]): number {
    const salary = this.salary();
    if (!salary) return 0;

    for (const key of keys) {
      const candidate = Number(salary[key] ?? NaN);
      if (Number.isFinite(candidate)) {
        return candidate;
      }
    }

    return 0;
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }
}
