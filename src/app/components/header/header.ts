import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessControlService } from '../../core/auth/access-control.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuditLogService } from '../../services/audit-log.service';
import { DashboardService } from '../../services/dashboard.service';
import { OrderNotificationService } from '../../services/order-notification.service';
import { ToastService } from '../../shared/toast/toast.service';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  readonly i18n = inject(TranslationService);
  readonly accessControl = inject(AccessControlService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly auditLogService = inject(AuditLogService);
  private readonly dashboardService = inject(DashboardService);
  readonly orderNotifications = inject(OrderNotificationService);
  private readonly toastService = inject(ToastService);

  @Output() menuToggle = new EventEmitter<void>();

  searchQuery = signal('');
  notifCount = this.orderNotifications.unreadCount;
  balance = signal('0');
  balanceCurrency = signal('ريال');
  readonly currentLanguage = this.i18n.language;
  readonly nextLanguage = computed(() => (this.currentLanguage() === 'en' ? 'ar' : 'en'));
  readonly nextLanguageShort = computed(() =>
    this.nextLanguage() === 'ar' ? this.i18n.t('language.short.ar') : this.i18n.t('language.short.en'),
  );
  readonly nextLanguageAria = computed(() =>
    this.nextLanguage() === 'ar'
      ? this.i18n.t('language.switchToArabic')
      : this.i18n.t('language.switchToEnglish'),
  );
  readonly roleLabel = computed(() => this.i18n.t(`roles.${this.accessControl.role()}`));
  readonly displayBalanceCurrency = computed(() => this.translateCurrency(this.balanceCurrency()));

  constructor() {
    this.orderNotifications.start();
    effect(() => {
      this.i18n.language();
      this.loadHeaderBalance();
    });
  }

  openNotificationsPage(): void {
    this.orderNotifications.markAllAsRead();
    void this.router.navigateByUrl('/notifications');
  }

  logout(): void {
    this.auditLogService.log({
      action: 'Auth Logout',
      entityType: 'auth',
      summary: this.i18n.t('auth.logout.auditSummary'),
    });
    this.authService.logout();
    this.toastService.info(this.i18n.t('auth.logout.success'));
    void this.router.navigateByUrl('/login');
  }

  toggleLanguage(): void {
    this.i18n.setLanguage(this.nextLanguage());
  }

  private translateCurrency(currency: string): string {
    const normalized = currency.trim().toUpperCase();
    if (normalized === 'SAR' || currency === 'ريال' || currency === 'ر.س') {
      return this.i18n.t('common.currency');
    }

    return currency;
  }

  private loadHeaderBalance(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        const salesStat = data.stats.find((stat) => stat.id === 'sales');
        this.balance.set(salesStat?.value ?? '0');
        this.balanceCurrency.set(salesStat?.currency ?? 'SAR');
      },
      error: () => {
        this.balance.set('0');
        this.balanceCurrency.set('SAR');
      },
    });
  }
}
