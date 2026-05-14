import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';
import { Order, OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from './orders.model';
import { CreateOrderPayload, OrdersService } from './orders.service';
import { AuditLogService } from '../../services/audit-log.service';
import { CanDisableDirective } from '../../shared/access/can-disable.directive';
import { ToastService } from '../../shared/toast/toast.service';
import { OrderNotificationService } from '../../services/order-notification.service';
import { TranslationService } from '../../core/i18n/translation.service';

interface OrderMenuState {
  id: string;
}

interface CreateOrderFormState {
  orderNumber: string;
  customer: string;
  customerPhone: string;
  customerEmail: string;
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  shipping: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPostalCode: string;
  total: number;
  currency: string;
  status: OrderStatus;
  source: OrderSource;
  tags: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, CanDisableDirective],
  templateUrl: './orders.html',
  styleUrls: ['./orders.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pageSwap', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('260ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class OrdersComponent {
  private readonly preferredTabOrder = [
    'all',
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ] as const;
  private readonly storageKey = 'orders.currentPage';
  private readonly ordersService = inject(OrdersService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);
  readonly orderNotifications = inject(OrderNotificationService);
  private readonly pageSize = 10;
  private readonly pageWindowSize = 4;

  readonly statusOptions: OrderStatus[] = [
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
  ];
  readonly paymentStatusOptions: PaymentStatus[] = ['Paid', 'Unpaid', 'Refunded'];
  readonly paymentOptions: PaymentMethod[] = ['Apple Pay', 'Bank Transfer', 'Cash on Delivery', 'Credit Card', 'STC Pay'];
  readonly checkoutPaymentOptions: PaymentMethod[] = ['Cash on Delivery', 'Credit Card'];
  readonly sourceOptions = ['All', 'Store', 'Manual', 'App'];

  readonly tabs = signal([{ label: 'All', key: 'all', count: 0 }]);
  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly activeTab = signal('all');
  readonly currentPage = signal(1);
  readonly sourceFilter = signal('All');
  readonly paymentFilter = signal('All');
  readonly paymentStatusFilter = signal('All');
  readonly openMenu = signal<OrderMenuState | null>(null);
  readonly isCreateModalOpen = signal(false);
  readonly form = signal<CreateOrderFormState>(this.emptyForm());

  readonly filteredOrders = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.activeTab();
    const sourceFilter = this.sourceFilter().toLowerCase();
    const paymentFilter = this.paymentFilter().toLowerCase();
    const paymentStatusFilter = this.paymentStatusFilter().toLowerCase();

    return this.orders().filter((order) => {
      const statusKey = order.status.toLowerCase().replace(/\s+/g, '-');
      const matchesTab = tab === 'all' || statusKey === tab;
      const matchesSource = sourceFilter === 'all' || order.source.toLowerCase() === sourceFilter;
      const matchesPayment = paymentFilter === 'all' || order.payment.toLowerCase() === paymentFilter;
      const matchesPaymentStatus =
        paymentStatusFilter === 'all' || order.paymentStatus.toLowerCase() === paymentStatusFilter;
      const matchesQuery =
        !query ||
        [
          order.orderNumber,
          order.customer,
          order.customerPhone,
          order.customerEmail ?? '',
          order.payment,
          order.shipping,
          order.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesTab && matchesSource && matchesPayment && matchesPaymentStatus && matchesQuery;
    });
  });

  readonly orderedTabs = computed(() => {
    const priority = new Map<string, number>(this.preferredTabOrder.map((key, index) => [key, index]));

    return [...this.tabs()].sort((left, right) => {
      const leftOrder = priority.get(left.key) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = priority.get(right.key) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label);
    });
  });

  readonly paginatedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  readonly visibleRange = computed(() => {
    const total = this.filteredOrders().length;
    if (total === 0) return { start: 0, end: 0 };

    const start = (this.currentPage() - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return { start, end };
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize)));

  readonly paginationItems = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 1, total - this.pageWindowSize + 1));
    const end = Math.min(total, start + this.pageWindowSize - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  constructor() {
    this.orderNotifications.start();
    this.currentPage.set(this.readPersistedPage());
    this.loadOrders();
  }

  openNotifications(): void {
    void this.router.navigateByUrl('/notifications');
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.ordersService.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.tabs.set(this.ordersService.buildTabs(orders));
        this.syncCurrentPageWithinRange();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || this.i18n.t('ordersPage.messages.loadError'));
        this.toastService.error(
          error?.error?.message || this.i18n.t('ordersPage.messages.loadError'),
        );
        this.isLoading.set(false);
      },
    });
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.persistCurrentPage();
  }

  setActiveTab(key: string): void {
    this.activeTab.set(key);
    this.currentPage.set(1);
    this.persistCurrentPage();
  }

  updateSourceFilter(value: string): void {
    this.sourceFilter.set(value);
    this.resetPagination();
  }

  updatePaymentFilter(value: string): void {
    this.paymentFilter.set(value);
    this.resetPagination();
  }

  updatePaymentStatusFilter(value: string): void {
    this.paymentStatusFilter.set(value);
    this.resetPagination();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.sourceFilter.set('All');
    this.paymentFilter.set('All');
    this.paymentStatusFilter.set('All');
    this.activeTab.set('all');
    this.resetPagination();
  }

  toggleMenu(id: string): void {
    const current = this.openMenu();
    this.openMenu.set(current?.id === id ? null : { id });
  }

  closeMenu(): void {
    this.openMenu.set(null);
  }

  isMenuOpen(id: string): boolean {
    const menu = this.openMenu();
    return menu?.id === id;
  }

  changeStatus(order: Order, status: OrderStatus): void {
    if (order.status === status) {
      this.closeMenu();
      return;
    }

    this.ordersService.updateStatus(order.id, status).subscribe({
      next: (updated) => {
        this.auditLogService.log({
          action: 'Order Status Updated',
          entityType: 'order',
          entityId: updated.id,
          summary: `Order ${updated.orderNumber} status changed to ${updated.status}.`,
        });
        this.replaceOrder(updated);
        this.toastService.success(this.i18n.t('ordersPage.messages.statusUpdated'));
        this.closeMenu();
      },
      error: (error) => {
        this.toastService.error(
          error?.error?.message || this.i18n.t('ordersPage.messages.statusUpdateError'),
        );
      },
    });
  }

  openCreateModal(): void {
    this.form.set(this.emptyForm());
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.form.set(this.emptyForm());
    this.isCreateModalOpen.set(false);
  }

  updateForm<K extends keyof CreateOrderFormState>(key: K, value: CreateOrderFormState[K]): void {
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  createOrder(): void {
    const form = this.form();
    if (
      !form.customer.trim() ||
      !form.customerPhone.trim() ||
      !form.shipping.trim() ||
      !form.shippingCity.trim() ||
      !form.shippingCountry.trim() ||
      !form.shippingPostalCode.trim()
    ) {
      const message = this.i18n.t('ordersPage.messages.requiredAddress');
      this.errorMessage.set(message);
      this.toastService.error(message);
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const payload: CreateOrderPayload = {
      orderNumber: form.orderNumber.trim() || undefined,
      source: form.source,
      customer: form.customer,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      payment: form.payment,
      paymentStatus: form.paymentStatus,
      shipping: form.shipping,
      shippingCity: form.shippingCity,
      shippingCountry: form.shippingCountry,
      shippingPostalCode: form.shippingPostalCode,
      total: Number(form.total),
      currency: form.currency,
      status: form.status,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    this.ordersService.createOrder(payload).subscribe({
      next: (order) => {
        this.auditLogService.log({
          action: 'Order Created',
          entityType: 'order',
          entityId: order.id,
          summary: `Order ${order.orderNumber} was created for ${order.customer}.`,
        });
        this.orders.update((orders) => [order, ...orders]);
        this.tabs.set(this.ordersService.buildTabs(this.orders()));
        this.closeCreateModal();
        this.currentPage.set(1);
        this.persistCurrentPage();
        this.isSaving.set(false);
        this.toastService.success(this.i18n.t('ordersPage.messages.created'));
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message || this.i18n.t('ordersPage.messages.createError'));
        this.toastService.error(error?.error?.message || this.i18n.t('ordersPage.messages.createError'));
        this.isSaving.set(false);
      },
    });
  }

  exportOrders(): void {
    if (typeof window === 'undefined') return;

    const blob = new Blob([JSON.stringify(this.filteredOrders(), null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'salla-orders.json';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastService.info(this.i18n.t('ordersPage.messages.exported'));
  }

  nextPage(): void {
    if (this.currentPage() >= this.totalPages()) return;
    this.currentPage.update((page) => page + 1);
    this.persistCurrentPage();
  }

  previousPage(): void {
    if (this.currentPage() <= 1) return;
    this.currentPage.update((page) => page - 1);
    this.persistCurrentPage();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.persistCurrentPage();
  }

  trackById(_: number, order: Order): string {
    return order.id;
  }

  paymentMethodClass(method: Order['payment']): string {
    return method.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  paymentTone(status: PaymentStatus): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'refunded':
        return 'warning';
      default:
        return 'danger';
    }
  }

  statusTone(status: string): string {
    const normalized = status.toLowerCase();

    if (normalized.includes('delivered')) return 'success';
    if (normalized.includes('shipped') || normalized.includes('processing')) return 'info';
    if (normalized.includes('cancel')) return 'danger';
    return 'neutral';
  }

  shippingTone(shipping: string): string {
    return shipping.toLowerCase().includes("doesn't require shipping") ? 'muted' : 'accent';
  }

  tabLabel(label: string): string {
    const normalized = label.trim().toLowerCase().replace(/\s+/g, '-');
    return this.i18n.t(`ordersPage.tabs.${normalized}`);
  }

  sourceLabel(source: string): string {
    return this.i18n.t(`ordersPage.sources.${source.trim().toLowerCase()}`);
  }

  paymentLabel(payment: string): string {
    const key = payment.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.i18n.t(`ordersPage.payments.${key}`);
  }

  paymentStatusLabel(status: string): string {
    return this.i18n.t(`ordersPage.paymentStatuses.${status.trim().toLowerCase()}`);
  }

  orderStatusLabel(status: string): string {
    return this.i18n.t(`ordersPage.statuses.${status.trim().toLowerCase().replace(/\s+/g, '-')}`);
  }

  private replaceOrder(updated: Order): void {
    this.orders.update((orders) => orders.map((order) => (order.id === updated.id ? updated : order)));
    this.tabs.set(this.ordersService.buildTabs(this.orders()));
  }

  private resetPagination(): void {
    this.currentPage.set(1);
    this.persistCurrentPage();
  }

  private syncCurrentPageWithinRange(): void {
    const totalPages = this.totalPages();
    const nextPage = Math.min(Math.max(1, this.currentPage()), totalPages);
    this.currentPage.set(nextPage);
    this.persistCurrentPage();
  }

  private persistCurrentPage(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(this.storageKey, String(this.currentPage()));
  }

  private readPersistedPage(): number {
    if (typeof window === 'undefined') return 1;

    const value = Number(window.sessionStorage.getItem(this.storageKey) ?? '1');
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  private emptyForm(): CreateOrderFormState {
    return {
      orderNumber: '',
      customer: '',
      customerPhone: '',
      customerEmail: '',
      payment: 'Cash on Delivery',
      paymentStatus: 'Unpaid',
      shipping: 'Nasr City',
      shippingCity: 'Cairo',
      shippingCountry: 'Egypt',
      shippingPostalCode: '11765',
      total: 0,
      currency: 'ريال',
      status: 'pending',
      source: 'Manual',
      tags: '',
    };
  }
}
