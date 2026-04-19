import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { StaffWorkspaceNavComponent } from '../workspace-nav/staff-workspace-nav';

@Component({
  selector: 'app-staff-attendance',
  standalone: true,
  imports: [CommonModule, JsonPipe, RouterModule, StaffWorkspaceNavComponent],
  templateUrl: './attendance.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffAttendanceComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly toastService = inject(ToastService);

  readonly isBusy = signal(false);
  readonly feedback = signal('');
  readonly errorMessage = signal('');
  readonly lastPayload = signal<unknown>(null);

  checkIn(): void {
    this.runAction(() => this.adminApi.checkIn(), 'Staff check-in recorded.');
  }

  checkOut(): void {
    this.runAction(() => this.adminApi.checkOut(), 'Staff check-out recorded.');
  }

  private runAction(
    requestFactory: () => ReturnType<AdminApiService['checkIn']>,
    successMessage: string,
  ): void {
    this.isBusy.set(true);
    this.errorMessage.set('');
    this.feedback.set('');

    requestFactory().subscribe({
      next: (payload) => {
        this.lastPayload.set(payload ?? null);
        this.feedback.set(successMessage);
        this.toastService.success(successMessage);
        this.isBusy.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'The attendance action could not be completed.';
        this.errorMessage.set(message);
        this.toastService.error(message);
        this.isBusy.set(false);
      },
    });
  }
}
