import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AuditLogService } from '../../../services/audit-log.service';
import { CanDisableDirective } from '../../../shared/access/can-disable.directive';
import { SalaryAdjustmentPayload, SalaryRecord, StaffRecord } from '../../../core/api/admin.models';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-staff-salary-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CanDisableDirective],
  templateUrl: './salary-detail.html',
  styleUrls: ['../../products/catalog-detail.scss', '../staff.scss', './salary-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffSalaryDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly staff = signal<StaffRecord | null>(null);
  readonly salary = signal<SalaryRecord | null>(null);
  readonly month = signal(this.currentMonth());
  readonly adjustmentAmount = signal(0);
  readonly adjustmentReason = signal('');
  readonly localPaidOverride = signal(false);
  readonly isLoading = signal(true);
  readonly isBusy = signal(false);
  readonly errorMessage = signal('');

  readonly baseSalary = computed(() => this.numberValue('baseSalary', 'amount', 'total'));
  readonly totalDeductions = computed(() => this.numberValue('totalDeductions', 'deductions'));
  readonly netSalary = computed(() => this.numberValue('finalSalary', 'netSalary', 'total', 'amount'));
  readonly salaryStatus = computed(() => {
    const salary = this.salary();
    if (!salary) return 'Not loaded';
    if (this.isSalaryMarkedPaid(salary)) return 'Paid';
    return 'Pending';
  });

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
            this.loadSalary();
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

  setMonth(value: string): void {
    this.month.set(value);
    this.localPaidOverride.set(false);
  }

  loadSalary(): void {
    const staffId = this.id(this.staff());
    const month = this.month().trim();
    if (!staffId || !month) return;

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.getSalary(staffId, month).subscribe({
      next: (salary) => {
        this.salary.set(this.normalizeSalary(salary));
        this.isBusy.set(false);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to load salary details.');
        this.isBusy.set(false);
        this.isLoading.set(false);
      },
    });
  }

  adjustSalary(): void {
    const staffId = this.id(this.staff());
    const month = this.month().trim();
    if (!staffId || !month) return;

    const payload: SalaryAdjustmentPayload = {
      finalSalary: Number(this.adjustmentAmount()),
      reason: this.adjustmentReason().trim(),
    };

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.adjustSalary(staffId, month, payload).subscribe({
      next: () => {
        this.auditLogService.log({
          action: 'Salary Adjusted',
          entityType: 'salary',
          entityId: `${staffId}:${month}`,
          summary: `Salary for ${this.userName(this.staff())} was adjusted to ${payload.finalSalary}.`,
        });
        this.toastService.success('Salary adjusted successfully.');
        this.loadSalary();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to adjust salary.');
        this.toastService.error(this.errorMessage());
        this.isBusy.set(false);
      },
    });
  }

  paySalary(): void {
    const staffId = this.id(this.staff());
    const month = this.month().trim();
    if (!staffId || !month) return;

    this.isBusy.set(true);
    this.errorMessage.set('');

    this.adminApi.paySalary(staffId, month).subscribe({
      next: () => {
        this.auditLogService.log({
          action: 'Salary Paid',
          entityType: 'salary',
          entityId: `${staffId}:${month}`,
          summary: `Salary payment was submitted for ${this.userName(this.staff())} (${month}).`,
        });
        this.localPaidOverride.set(true);
        this.toastService.success('Salary payment sent successfully.');
        this.loadSalary();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || 'Unable to pay salary.');
        this.toastService.error(this.errorMessage());
        this.isBusy.set(false);
      },
    });
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

  joinDateLabel(record: StaffRecord | null | undefined): string {
    return record?.joinDate ? String(record.joinDate).slice(0, 10) : '--';
  }

  statusLabel(record: StaffRecord | null | undefined): string {
    return record?.isActive ? 'Active' : 'Inactive';
  }

  private numberValue(...keys: string[]): number {
    const salary = this.salary();
    if (!salary) return 0;
    for (const key of keys) {
      const candidate = Number(salary[key] ?? NaN);
      if (Number.isFinite(candidate)) return candidate;
    }
    return 0;
  }

  private normalizeSalary(salary: SalaryRecord | null): SalaryRecord | null {
    if (!salary) return salary;

    if (this.localPaidOverride() && !this.hasExplicitPaidFlag(salary)) {
      return {
        ...salary,
        paid: true,
        status: 'paid',
      };
    }

    return salary;
  }

  private hasExplicitPaidFlag(salary: SalaryRecord): boolean {
    return (
      salary.paid !== undefined ||
      salary['isPaid'] !== undefined ||
      salary['status'] !== undefined ||
      salary['paymentStatus'] !== undefined ||
      salary.paidAt !== undefined
    );
  }

  private isSalaryMarkedPaid(salary: SalaryRecord): boolean {
    if (salary.paid === true) return true;
    if (salary['isPaid'] === true) return true;
    if (typeof salary.paidAt === 'string' && salary.paidAt.trim()) return true;

    const statusCandidates = [salary['status'], salary['paymentStatus'], salary['salaryStatus']]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean);

    return statusCandidates.some((value) => value === 'paid' || value === 'completed');
  }

  private currentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }
}
