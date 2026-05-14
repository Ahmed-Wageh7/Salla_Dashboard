import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AuditLogService } from '../../../services/audit-log.service';
import { CanDisableDirective } from '../../../shared/access/can-disable.directive';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-staff-attendance',
  standalone: true,
  imports: [CommonModule, RouterModule, StaffWorkspaceNavComponent, CanDisableDirective],
  templateUrl: './attendance.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffAttendanceComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);
  readonly i18n = inject(TranslationService);

  readonly isBusy = signal(false);
  readonly feedback = signal('');
  readonly errorMessage = signal('');

  checkIn(): void {
    this.runAction(() => this.adminApi.checkIn(), this.i18n.t('staffPage.attendance.messages.checkIn'));
  }

  checkOut(): void {
    this.runAction(() => this.adminApi.checkOut(), this.i18n.t('staffPage.attendance.messages.checkOut'));
  }

  private runAction(
    requestFactory: () => ReturnType<AdminApiService['checkIn']>,
    successMessage: string,
  ): void {
    this.isBusy.set(true);
    this.errorMessage.set('');
    this.feedback.set('');

    requestFactory().subscribe({
      next: () => {
        this.auditLogService.log({
          action:
            successMessage === this.i18n.t('staffPage.attendance.messages.checkIn')
              ? 'Attendance Check-In'
              : 'Attendance Check-Out',
          entityType: 'attendance',
          summary: successMessage,
        });
        this.feedback.set(successMessage);
        this.toastService.success(successMessage);
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || this.i18n.t('staffPage.attendance.messages.error');
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }
}
