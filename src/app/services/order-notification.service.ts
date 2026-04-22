import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { interval, of, Subscription, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminApiService } from '../core/api/admin-api.service';
import { AdminOrderRecord } from '../core/api/admin.models';
import { AuthService } from '../core/auth/auth.service';
import { environment } from '../../environments/environment';
import { ToastService } from '../shared/toast/toast.service';
import { Router } from '@angular/router';
import { TranslationService } from '../core/i18n/translation.service';

export interface OrderNotificationItem {
  id: string;
  orderId: string;
  orderNumber: string;
  title: string;
  message: string;
  subject: string;
  createdAt: string;
  read: boolean;
  source: 'realtime' | 'polling' | 'local';
}

@Injectable({ providedIn: 'root' })
export class OrderNotificationService {
  private readonly storageKey = 'notifications.order-feed';
  private readonly knownOrdersKey = 'notifications.known-order-ids';
  private readonly maxItems = 20;
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private readonly notificationsState = signal<OrderNotificationItem[]>(this.readStoredNotifications());
  private readonly browserPermissionState = signal<NotificationPermission>(this.readPermission());
  private readonly knownOrderIds = new Set<string>(this.readKnownOrderIds());
  private readonly pollingIntervalMs = Math.max(environment.realtime.orderPollingIntervalMs, 5000);

  readonly notifications = computed(() => this.notificationsState());
  readonly unreadCount = computed(() => this.notificationsState().filter((item) => !item.read).length);
  readonly browserPermission = computed(() => this.browserPermissionState());

  private pollingSubscription?: Subscription;
  private socket?: WebSocket;
  private started = false;
  private hasPrimedOrders = this.knownOrderIds.size > 0;

  constructor(
    private readonly adminApi: AdminApiService,
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
  ) {
    effect(() => {
      this.syncAttentionState(this.unreadCount());
    });
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return;

    this.started = true;
    this.connectWebSocket();
    this.startPolling();
  }

  requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      this.browserPermissionState.set('denied');
      return Promise.resolve('denied');
    }

    return Notification.requestPermission().then((permission) => {
      this.browserPermissionState.set(permission);
      return permission;
    });
  }

  markAllAsRead(): void {
    this.notificationsState.update((items) => items.map((item) => ({ ...item, read: true })));
    this.persistNotifications();
  }

  publishOrderCreated(order: AdminOrderRecord, source: OrderNotificationItem['source'] = 'local'): void {
    this.handleNewOrder(order, source);
  }

  private startPolling(): void {
    this.pollingSubscription = interval(this.pollingIntervalMs)
      .pipe(
        switchMap(() => this.fetchOrders()),
      )
      .subscribe((orders) => this.processOrders(orders, 'polling'));

    this.fetchOrders().subscribe((orders) => this.processOrders(orders, 'polling'));
  }

  private fetchOrders() {
    if (!this.authService.isAuthenticated()) {
      return of<AdminOrderRecord[]>([]);
    }

    return this.adminApi.getAdminOrders().pipe(catchError(() => of<AdminOrderRecord[]>([])));
  }

  private processOrders(
    orders: AdminOrderRecord[],
    source: Extract<OrderNotificationItem['source'], 'polling' | 'realtime'>,
  ): void {
    const normalized = [...orders].sort((left, right) =>
      String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')),
    );

    if (!this.hasPrimedOrders) {
      normalized.forEach((order) => this.rememberOrder(order));
      this.hasPrimedOrders = true;
      return;
    }

    for (const order of normalized) {
      const orderId = this.orderId(order);
      if (!orderId || this.knownOrderIds.has(orderId)) {
        continue;
      }

      this.handleNewOrder(order, source);
    }
  }

  private connectWebSocket(): void {
    const websocketUrl = environment.realtime.notificationsUrl?.trim();
    if (!websocketUrl) return;

    try {
      this.socket = new WebSocket(websocketUrl);
      this.socket.addEventListener('message', (event) => {
        const parsed = this.parseSocketMessage(event.data);
        if (!parsed) return;

        if (Array.isArray(parsed)) {
          parsed.forEach((order) => this.handleNewOrder(order, 'realtime'));
          return;
        }

        this.handleNewOrder(parsed, 'realtime');
      });
    } catch {
      this.socket = undefined;
    }
  }

  private parseSocketMessage(data: unknown): AdminOrderRecord | AdminOrderRecord[] | null {
    if (typeof data !== 'string') return null;

    try {
      const parsed = JSON.parse(data) as unknown;

      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        const eventPayload = parsed as {
          type?: string;
          order?: AdminOrderRecord;
          orders?: AdminOrderRecord[];
          data?: unknown;
        };

        if (eventPayload.order) return eventPayload.order;
        if (Array.isArray(eventPayload.orders)) return eventPayload.orders;
        if (
          eventPayload.type === 'order.created' &&
          eventPayload.data &&
          typeof eventPayload.data === 'object' &&
          !Array.isArray(eventPayload.data)
        ) {
          return eventPayload.data as AdminOrderRecord;
        }

        return parsed as AdminOrderRecord;
      }

      return null;
    } catch {
      return null;
    }
  }

  private handleNewOrder(order: AdminOrderRecord, source: OrderNotificationItem['source']): void {
    const orderId = this.orderId(order);
    if (!orderId || this.knownOrderIds.has(orderId)) {
      return;
    }

    const subject = this.notificationSubject(order);
    const orderNumber = this.orderNumber(order);
    const amount = this.i18n.formatNumber(this.orderAmount(order), { maximumFractionDigits: 2 });
    const currency = this.i18n.t('common.currency');
    const item: OrderNotificationItem = {
      id: `${orderId}:${source}`,
      orderId,
      orderNumber,
      title: this.i18n.t('notifications.orderTitle', { subject }),
      message: `${orderNumber} • ${amount} ${currency}`,
      subject,
      createdAt: order.createdAt ?? new Date().toISOString(),
      read: false,
      source,
    };

    this.rememberOrder(order);
    this.notificationsState.update((items) => [item, ...items].slice(0, this.maxItems));
    this.persistNotifications();
    this.toastService.success(item.message, {
      title: item.title,
      durationMs: 7000,
      variant: 'notification',
      actionLabel: this.i18n.t('toast.openOrder'),
      onAction: () => this.openOrder(item),
    });
    this.notifyAttention();
    this.showBrowserNotification(item);
  }

  private showBrowserNotification(item: OrderNotificationItem): void {
    if (
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      this.browserPermissionState() !== 'granted'
    ) {
      return;
    }

    if (document.visibilityState === 'visible') {
      return;
    }

    const notificationOptions: NotificationOptions & {
      badge?: string;
      renotify?: boolean;
      requireInteraction?: boolean;
      timestamp?: number;
    } = {
      body: item.message,
      tag: item.orderId,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      renotify: true,
      timestamp: new Date(item.createdAt).getTime(),
    };
    const notification = new Notification(item.title, notificationOptions);
    notification.onclick = () => {
      notification.close();
      this.openOrder(item);
    };
  }

  private notifyAttention(): void {
    if (typeof window === 'undefined') return;

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([180, 80, 180]);
    }

    this.playAttentionTone();
  }

  private playAttentionTone(): void {
    const BrowserAudioContext =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!BrowserAudioContext) return;

    try {
      const context = new BrowserAudioContext();
      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.0001, context.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.9);
      masterGain.connect(context.destination);

      const playNote = (
        frequency: number,
        startTime: number,
        duration: number,
        type: OscillatorType,
      ) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.02);
      };

      const now = context.currentTime;
      playNote(740, now, 0.22, 'triangle');
      playNote(988, now + 0.18, 0.34, 'sine');

      window.setTimeout(() => {
        void context.close();
      }, 1200);
    } catch {
      // Ignore audio failures and keep the rest of the notification flow intact.
    }
  }

  private openOrder(item: OrderNotificationItem): void {
    this.markAsRead(item.id);
    if (typeof window !== 'undefined') {
      void window.focus();
    }
    void this.router.navigate(['/orders', item.orderId]);
  }

  private markAsRead(id: string): void {
    this.notificationsState.update((items) =>
      items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    this.persistNotifications();
  }

  private syncAttentionState(unreadCount: number): void {
    if (typeof document === 'undefined') return;

    const baseTitle = document.title.replace(/^\(\d+\)\s+/, '') || 'Salla Dashboard';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    if (typeof navigator === 'undefined') return;
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (unreadCount > 0 && typeof badgeNavigator.setAppBadge === 'function') {
      void badgeNavigator.setAppBadge(unreadCount).catch(() => undefined);
    }

    if (unreadCount === 0 && typeof badgeNavigator.clearAppBadge === 'function') {
      void badgeNavigator.clearAppBadge().catch(() => undefined);
    }
  }

  private notificationSubject(order: AdminOrderRecord): string {
    const firstItem = order.items?.[0];
    if (typeof firstItem === 'string' && firstItem.trim()) {
      return firstItem.trim();
    }

    if (firstItem && typeof firstItem === 'object') {
      if (firstItem.productName?.trim()) return firstItem.productName.trim();
      if (firstItem.name?.trim()) return firstItem.name.trim();
      if (firstItem.title?.trim()) return firstItem.title.trim();
      if (typeof firstItem.product === 'string' && firstItem.product.trim()) {
        return firstItem.product.trim();
      }
      if (
        firstItem.product &&
        typeof firstItem.product === 'object' &&
        (firstItem.product.name?.trim() || firstItem.product.title?.trim())
      ) {
        return firstItem.product.name?.trim() || firstItem.product.title!.trim();
      }
    }

    const firstTag = order.tags?.find((tag) => tag.trim());
    if (firstTag) return firstTag.trim();

    return this.customerName(order);
  }

  private rememberOrder(order: AdminOrderRecord): void {
    const orderId = this.orderId(order);
    if (!orderId) return;

    this.knownOrderIds.add(orderId);
    this.persistKnownOrders();
  }

  private orderId(order: AdminOrderRecord): string {
    return String(order._id ?? order.id ?? '').trim();
  }

  private orderNumber(order: AdminOrderRecord): string {
    const value = String(order.orderNumber ?? this.orderId(order) ?? 'Order').trim();
    return value.startsWith('#') ? value : `#${value}`;
  }

  private orderAmount(order: AdminOrderRecord): number {
    return Number(order.totalAmount ?? order.totalPrice ?? order.total ?? 0);
  }

  private customerName(order: AdminOrderRecord): string {
    if (order.customer?.name?.trim()) return order.customer.name.trim();
    if (order.user && typeof order.user !== 'string' && order.user.name?.trim()) {
      return order.user.name.trim();
    }

    return 'a customer';
  }

  private persistNotifications(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(this.notificationsState()));
  }

  private persistKnownOrders(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.knownOrdersKey, JSON.stringify([...this.knownOrderIds]));
  }

  private readStoredNotifications(): OrderNotificationItem[] {
    if (typeof window === 'undefined') return [];

    try {
      const parsed = JSON.parse(window.localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.map((item) => {
            const notification = item as Partial<OrderNotificationItem>;
            return {
              id: notification.id ?? crypto.randomUUID(),
              orderId: notification.orderId ?? '',
              orderNumber: notification.orderNumber ?? 'Order',
              title: notification.title ?? 'Order',
              message: notification.message ?? '',
              subject: notification.subject ?? notification.orderNumber ?? 'Order',
              createdAt: notification.createdAt ?? new Date().toISOString(),
              read: Boolean(notification.read),
              source: notification.source ?? 'local',
            } satisfies OrderNotificationItem;
          })
        : [];
    } catch {
      return [];
    }
  }

  private readKnownOrderIds(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const parsed = JSON.parse(window.localStorage.getItem(this.knownOrdersKey) ?? '[]');
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  private readPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  }
}
