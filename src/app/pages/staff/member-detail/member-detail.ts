import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { StaffRecord } from '../../../core/api/admin.models';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-staff-member-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './member-detail.html',
  styleUrls: ['../../products/catalog-detail.scss', './member-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffMemberDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly adminApi = inject(AdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(TranslationService);

  readonly staff = signal<StaffRecord | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = params.get('id') ?? '';

          if (!id) {
            return of(null);
          }

          this.isLoading.set(true);
          this.errorMessage.set('');
          return this.adminApi.getAdminStaffById(id);
        }),
      )
      .subscribe({
        next: (staff) => {
          this.staff.set(staff);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message || this.i18n.t('staffPage.memberDetail.messages.loadError'));
          this.isLoading.set(false);
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
    if (!user) return this.i18n.t('staffPage.shared.unknownUser');
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
    return record?.isActive ? this.i18n.t('staffPage.shared.active') : this.i18n.t('staffPage.shared.inactive');
  }
}
