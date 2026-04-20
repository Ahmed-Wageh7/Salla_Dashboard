import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderNotificationItem, OrderNotificationService } from '../../services/order-notification.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  private readonly pageSize = 7;
  private readonly pageWindowSize = 4;

  readonly orderNotifications = inject(OrderNotificationService);
  private readonly router = inject(Router);
  readonly currentPage = signal(1);
  readonly paginatedNotifications = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.orderNotifications.notifications().slice(start, start + this.pageSize);
  });
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.orderNotifications.notifications().length / this.pageSize)),
  );
  readonly paginationItems = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 1, total - this.pageWindowSize + 1));
    const end = Math.min(total, start + this.pageWindowSize - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  constructor() {
    this.orderNotifications.start();
    this.orderNotifications.markAllAsRead();
    effect(() => {
      const total = this.totalPages();
      if (this.currentPage() > total) {
        this.currentPage.set(total);
      }
    });
  }

  enableDesktopNotifications(): void {
    void this.orderNotifications.requestBrowserPermission();
  }

  openOrdersPage(): void {
    void this.router.navigateByUrl('/orders');
  }

  openOrder(notification: OrderNotificationItem): void {
    void this.router.navigate(['/orders', notification.orderId]);
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((page) => page + 1);
  }

  previousPage(): void {
    if (this.currentPage() === 1) return;
    this.currentPage.update((page) => page - 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
  }

  sourceLabel(notification: OrderNotificationItem): string {
    return notification.source.charAt(0).toUpperCase() + notification.source.slice(1);
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
}
