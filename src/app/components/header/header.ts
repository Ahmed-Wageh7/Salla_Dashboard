import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessControlService } from '../../core/auth/access-control.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuditLogService } from '../../services/audit-log.service';
import { DashboardService } from '../../services/dashboard.service';
import { OrderNotificationService } from '../../services/order-notification.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
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

  constructor() {
    this.orderNotifications.start();
    this.loadHeaderBalance();
  }

  openNotificationsPage(): void {
    this.orderNotifications.markAllAsRead();
    void this.router.navigateByUrl('/notifications');
  }

  logout(): void {
    this.auditLogService.log({
      action: 'Auth Logout',
      entityType: 'auth',
      summary: 'User logged out of the admin dashboard.',
    });
    this.authService.logout();
    this.toastService.info('Logged out successfully.');
    void this.router.navigateByUrl('/login');
  }

  private loadHeaderBalance(): void {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        const salesStat = data.stats.find((stat) => stat.id === 'sales');
        this.balance.set(salesStat?.value ?? '0');
        this.balanceCurrency.set(salesStat?.currency ?? 'ريال');
      },
      error: () => {
        this.balance.set('0');
        this.balanceCurrency.set('ريال');
      },
    });
  }
}
