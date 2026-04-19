import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { AdminApiService } from '../../core/api/admin-api.service';
import { AdminOrderRecord, CheckoutOrderPayload } from '../../core/api/admin.models';
import { Order, OrderTab, OrderSource, OrderStatus, PaymentMethod, PaymentStatus } from './orders.model';

export interface CreateOrderPayload {
  orderNumber?: string;
  source: OrderSource;
  customer: string;
  customerPhone: string;
  customerEmail?: string;
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  shipping: string;
  shippingCity: string;
  shippingCountry: string;
  shippingPostalCode: string;
  total: number;
  currency: string;
  status: OrderStatus;
  tags?: string[];
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly storageKey = 'orders.localRecords';
  private readonly cachedOrders = new Map<string, Order>();

  constructor(
    private readonly adminApi: AdminApiService,
    private readonly http: HttpClient,
  ) {}

  getOrders(): Observable<Order[]> {
    return this.adminApi.getAdminOrders().pipe(
      map((orders) => this.mergeWithStoredOrders(orders.map((order) => this.mapOrder(order)))),
      catchError((error) =>
        this.loadFallbackOrders(error).pipe(map((orders) => this.mergeWithStoredOrders(orders))),
      ),
    );
  }

  getOrderById(id: string): Observable<Order | null> {
    const localMatch = this.readStoredOrders().find((order) => order.id === id);
    if (localMatch) return of(localMatch);

    return this.adminApi.getAdminOrderById(id).pipe(
      map((order) => this.mapOrder(order)),
      map((order) => {
        this.cachedOrders.set(order.id, order);
        return order;
      }),
      catchError((error) =>
        this.getOrders().pipe(
          map((orders) => orders.find((order) => order.id === id) ?? null),
          switchMap((order) => {
            if (order) return of(order);
            if (error instanceof HttpErrorResponse) return of(null);
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  createOrder(payload: CreateOrderPayload): Observable<Order> {
    const requestPayload = this.toCheckoutPayload(payload);

    return this.adminApi.createOrder(requestPayload).pipe(
      map((order) => this.mapOrder(order)),
      map((order) => this.persistUpsert(order)),
      catchError((error) => {
        if (!this.shouldFallbackToLocalCreate(error)) {
          return throwError(() => error);
        }

        return of(this.persistUpsert(this.createLocalOrder(payload)));
      }),
    );
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.adminApi.updateOrderStatus(id, status).pipe(
      map((order) => this.mapOrder(order, this.findExistingOrder(id))),
      map((order) => this.persistUpsert(order)),
    );
  }

  buildTabs(orders: Order[]): OrderTab[] {
    const counts = orders.reduce<Record<string, number>>((acc, order) => {
      const key = this.toTabKey(order.status);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return [
      { label: 'All', key: 'all', count: orders.length },
      ...Object.entries(counts).map(([key, count]) => ({
        key,
        count,
        label: this.toLabel(key),
      })),
    ];
  }

  private mapOrder(order: AdminOrderRecord, fallback?: Order): Order {
    const id = order._id ?? order.id ?? crypto.randomUUID();
    const customer =
      order.customer ??
      (typeof order.user === 'object' && order.user !== null ? order.user : undefined);
    const shipping =
      order.shipping?.trim() ||
      (order.shippingAddress?.city || order.shippingAddress?.country
        ? [order.shippingAddress?.city, order.shippingAddress?.country].filter(Boolean).join(', ')
        : fallback?.shipping || "Doesn't Require Shipping");
    const rawStatus = order.orderStatus ?? order.status ?? fallback?.status ?? 'pending';

    return {
      id,
      orderNumber: String(order.orderNumber ?? fallback?.orderNumber ?? id.slice(0, 8)).toUpperCase(),
      source: (order.source as OrderSource) ?? fallback?.source ?? 'Store',
      customer: customer?.name ?? fallback?.customer ?? 'Unknown customer',
      customerPhone: customer?.phone ?? fallback?.customerPhone ?? '-',
      customerEmail: customer?.email ?? fallback?.customerEmail ?? '',
      payment: (order.paymentMethod ?? fallback?.payment ?? 'Bank Transfer') as PaymentMethod,
      paymentStatus: order.paymentStatus
        ? this.normalizePaymentStatus(order.paymentStatus)
        : (fallback?.paymentStatus ?? 'Unpaid'),
      shipping,
      total: Number(order.totalAmount ?? order.totalPrice ?? order.total ?? fallback?.total ?? 0),
      currency: order.currency ?? fallback?.currency ?? 'EGP',
      status: String(rawStatus).toLowerCase() as OrderStatus,
      createdDate: order.createdAt ? this.toDate(order.createdAt) : (fallback?.createdDate ?? this.toDate()),
      updatedDate: order.updatedAt ? this.toDate(order.updatedAt) : this.toDate(),
      tags: order.tags ?? fallback?.tags ?? [],
    };
  }

  private toCheckoutPayload(payload: CreateOrderPayload): CheckoutOrderPayload {
    return {
      paymentMethod: this.toCheckoutPaymentMethod(payload.payment),
      shippingAddress: {
        street: payload.shipping.trim(),
        city: payload.shippingCity.trim(),
        country: payload.shippingCountry.trim(),
        postalCode: payload.shippingPostalCode.trim(),
      },
    };
  }

  private createLocalOrder(payload: CreateOrderPayload): Order {
    const now = new Date().toISOString().slice(0, 10);

    return {
      id: crypto.randomUUID(),
      orderNumber: payload.orderNumber?.trim() || `${Date.now()}`.slice(-8),
      source: payload.source,
      customer: payload.customer.trim(),
      customerPhone: payload.customerPhone.trim(),
      customerEmail: payload.customerEmail?.trim() || '',
      payment: payload.payment,
      paymentStatus: payload.paymentStatus,
      shipping: payload.shipping.trim() || "Doesn't Require Shipping",
      total: Number(payload.total),
      currency: payload.currency.trim() || 'EGP',
      status: payload.status,
      createdDate: now,
      updatedDate: now,
      tags: payload.tags ?? [],
    };
  }

  private mergeWithStoredOrders(orders: Order[]): Order[] {
    const localOrders = this.readStoredOrders();
    const map = new Map<string, Order>();

    for (const order of orders) {
      map.set(order.id, order);
    }

    for (const order of localOrders) {
      map.set(order.id, order);
    }

    const merged = [...map.values()].sort((left, right) =>
      right.createdDate.localeCompare(left.createdDate) || right.orderNumber.localeCompare(left.orderNumber),
    );

    for (const order of merged) {
      this.cachedOrders.set(order.id, order);
    }

    return merged;
  }

  private findExistingOrder(id: string): Order | undefined {
    return this.cachedOrders.get(id) ?? this.readStoredOrders().find((order) => order.id === id);
  }

  private persistUpsert(order: Order): Order {
    if (typeof window === 'undefined') return order;

    const orders = this.readStoredOrders().filter((item) => item.id !== order.id);
    orders.unshift(order);
    window.localStorage.setItem(this.storageKey, JSON.stringify(orders));
    this.cachedOrders.set(order.id, order);
    return order;
  }

  private readStoredOrders(): Order[] {
    if (typeof window === 'undefined') return [];

    try {
      const parsed = JSON.parse(window.localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(parsed) ? parsed.map((order) => this.normalizeStoredOrder(order)) : [];
    } catch {
      return [];
    }
  }

  private toDate(value?: string): string {
    if (!value) return new Date().toISOString().slice(0, 10);
    return value.slice(0, 10);
  }

  private normalizePaymentStatus(status?: string): PaymentStatus {
    const normalized = (status ?? 'Unpaid').toLowerCase();
    if (normalized.includes('refund')) return 'Refunded';
    if (normalized.includes('paid') && !normalized.includes('unpaid')) return 'Paid';
    return 'Unpaid';
  }

  private toTabKey(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  private toLabel(key: string): string {
    return key
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private loadFallbackOrders(error: unknown): Observable<Order[]> {
    if (!this.isConnectionError(error)) {
      return throwError(() => error);
    }

    return this.http.get<Order[]>('/orders-data.json');
  }

  private shouldFallbackToLocalCreate(error: unknown): boolean {
    return error instanceof HttpErrorResponse && [0].includes(error.status);
  }

  private isConnectionError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 0;
  }

  private normalizeStoredOrder(order: unknown): Order {
    const parsed = order as Partial<Order>;

    return {
      id: parsed.id ?? crypto.randomUUID(),
      orderNumber: parsed.orderNumber ?? '',
      source: (parsed.source ?? 'Manual') as OrderSource,
      customer: parsed.customer ?? 'Unknown customer',
      customerPhone: parsed.customerPhone ?? '-',
      customerEmail: parsed.customerEmail ?? '',
      payment: (parsed.payment ?? 'Cash on Delivery') as PaymentMethod,
      paymentStatus: (parsed.paymentStatus ?? 'Unpaid') as PaymentStatus,
      shipping: parsed.shipping ?? "Doesn't Require Shipping",
      total: Number(parsed.total ?? 0),
      currency: parsed.currency ?? 'EGP',
      status: this.normalizeStoredStatus(parsed.status),
      createdDate: parsed.createdDate ?? this.toDate(),
      updatedDate: parsed.updatedDate ?? this.toDate(),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  }

  private normalizeStoredStatus(status?: string): OrderStatus {
    const normalizedStatus = (status ?? 'pending').toLowerCase();

    switch (normalizedStatus) {
      case 'new':
        return 'pending';
      case 'preparing':
        return 'processing';
      case 'in delivery':
      case 'in-delivery':
        return 'shipped';
      case 'completed':
        return 'delivered';
      case 'cancelled':
      case 'pending':
      case 'processing':
      case 'shipped':
      case 'delivered':
        return normalizedStatus as OrderStatus;
      default:
        return 'pending';
    }
  }

  private toCheckoutPaymentMethod(payment: PaymentMethod): string {
    switch (payment) {
      case 'Cash on Delivery':
        return 'cod';
      case 'Credit Card':
        return 'card';
      case 'Bank Transfer':
        return 'bank_transfer';
      case 'Apple Pay':
        return 'apple_pay';
      case 'STC Pay':
        return 'stc_pay';
      default:
        return payment.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }
  }
}
