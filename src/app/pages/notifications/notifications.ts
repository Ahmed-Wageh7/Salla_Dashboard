import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrderNotificationItem, OrderNotificationService } from '../../services/order-notification.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPageComponent {
  readonly orderNotifications = inject(OrderNotificationService);
  private readonly router = inject(Router);

  constructor() {
    this.orderNotifications.start();
    this.orderNotifications.markAllAsRead();
  }

  enableDesktopNotifications(): void {
    void this.orderNotifications.requestBrowserPermission();
  }

  openOrder(notification: OrderNotificationItem): void {
    void this.router.navigate(['/orders', notification.orderId]);
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
}
