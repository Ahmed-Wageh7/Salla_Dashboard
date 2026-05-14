import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AdminApiService } from '../core/api/admin-api.service';
import { AdminOrderRecord } from '../core/api/admin.models';
import { DASHBOARD_DATA } from '../data/dashboard-data';
import { ORDERS_DATA } from '../data/orders-data';
import { TranslationService } from '../core/i18n/translation.service';

export interface DashboardApiResponse {
  welcomeTitle: string;
  datePreset: string;
  dateDisplay: string;
  stats: StatCard[];
  slides: Slide[];
  goals: GoalsData;
  growth: GrowthData;
  ordersTitle: string;
  viewAllOrdersLabel: string;
  newestOrders: Order[];
}

export interface StatCard {
  id: 'sales' | 'orders' | 'visits' | 'conversion';
  label: string;
  value: string;
  currency?: string;
  chartType: 'line' | 'area';
  chartPoints: string;
  reportLabel: string;
}

export interface Slide {
  image: string;
  title: string;
  description: string;
}

export interface GoalsData {
  title: string;
  description: string;
  progressLabel: string;
  progressPercent: number;
  progressLabels: string[];
  currentOrders: number;
  goal: number;
  ordersToGoal: number;
  editLabel: string;
  helpLabel: string;
}

export interface GrowthData {
  title: string;
  totalValue: string;
  totalLabel: string;
  totalSubLabel: string;
  indicatorValue: string;
  dateLabel: string;
  datePreset: string;
  dateRange: string;
  chartPoints: string;
  xAxisLabels: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentClass: string;
  shippingLabel: string;
  priceValue: string;
  priceCurrency: string;
  status: string;
  statusClass: string;
  createdDate: string;
  createdTime: string;
  actionLabel: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly adminApi = inject(AdminApiService);
  private readonly i18n = inject(TranslationService);

  getDashboardData(): Observable<DashboardApiResponse> {
    return this.adminApi.getAdminOrders().pipe(
      map((orders) => this.buildDashboardData(orders)),
      catchError(() => of(this.buildDashboardData(this.fallbackOrders()))),
    );
  }

  private buildDashboardData(orders: AdminOrderRecord[]): DashboardApiResponse {
    const normalizedOrders = [...orders].sort((left, right) =>
      String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')),
    );
    const totalOrders = normalizedOrders.length;
    const totalSales = normalizedOrders.reduce(
      (sum, order) => sum + this.orderAmount(order),
      0,
    );
    const last30DaysOrders = this.filterOrdersWithinDays(normalizedOrders, 30);
    const previous30DaysOrders = this.filterOrdersWithinWindow(normalizedOrders, 30, 60);
    const last30DaysTotal = last30DaysOrders.length;
    const previous30DaysTotal = previous30DaysOrders.length;
    const estimatedVisits = Math.max(totalOrders * 12, 0);
    const conversionRate =
      estimatedVisits > 0 ? ((totalOrders / estimatedVisits) * 100).toFixed(2) : '0.00';
    const growthPoints = this.buildChartPoints(last30DaysOrders);
    const growthLabels = this.buildGrowthLabels();
    const growthRange = this.buildGrowthRange();

    return {
      ...DASHBOARD_DATA,
      welcomeTitle: this.i18n.t('dashboard.welcomeTitle'),
      datePreset: this.i18n.t('dashboard.datePreset'),
      dateDisplay: this.buildDashboardDateDisplay(),
      stats: DASHBOARD_DATA.stats.map((stat) => {
        if (stat.id === 'orders') {
          return {
            ...stat,
            label: this.i18n.t('dashboard.stats.orders'),
            reportLabel: this.i18n.t('dashboard.stats.report'),
            value: this.i18n.formatNumber(totalOrders),
          };
        }

        if (stat.id === 'sales') {
          return {
            ...stat,
            label: this.i18n.t('dashboard.stats.sales'),
            currency: this.i18n.t('common.currency'),
            reportLabel: this.i18n.t('dashboard.stats.report'),
            value: this.i18n.formatNumber(totalSales, { maximumFractionDigits: 2 }),
          };
        }

        if (stat.id === 'visits') {
          return {
            ...stat,
            label: this.i18n.t('dashboard.stats.visits'),
            reportLabel: this.i18n.t('dashboard.stats.report'),
            value: this.i18n.formatNumber(estimatedVisits),
          };
        }

        if (stat.id === 'conversion') {
          return {
            ...stat,
            label: this.i18n.t('dashboard.stats.conversion'),
            reportLabel: this.i18n.t('dashboard.stats.report'),
            value: `${conversionRate}%`,
          };
        }

        return { ...stat, reportLabel: this.i18n.t('dashboard.stats.report') };
      }),
      slides: this.buildSlides(),
      goals: {
        ...DASHBOARD_DATA.goals,
        title: this.i18n.t('dashboard.goals.title'),
        description: this.i18n.t('dashboard.goals.description'),
        progressLabel: this.i18n.t('dashboard.goals.progressLabel'),
        progressLabels: this.buildGoalLabels(DASHBOARD_DATA.goals.goal),
        currentOrders: totalOrders,
        ordersToGoal: Math.max(0, DASHBOARD_DATA.goals.goal - totalOrders),
        editLabel: this.i18n.t('dashboard.goals.edit'),
        helpLabel: this.i18n.t('dashboard.goals.help'),
      },
      growth: {
        ...DASHBOARD_DATA.growth,
        title: this.i18n.t('dashboard.growth.title'),
        totalValue: this.i18n.formatNumber(last30DaysTotal),
        totalLabel: this.i18n.t('dashboard.growth.totalLabel'),
        indicatorValue: this.i18n.t('dashboard.growth.indicatorValue'),
        dateLabel: this.i18n.t('dashboard.growth.dateLabel'),
        datePreset: this.i18n.t('dashboard.growth.datePreset'),
        totalSubLabel:
          previous30DaysTotal > 0
            ? this.i18n.t('dashboard.growth.versusPrevious', {
                value: this.percentageChange(last30DaysTotal, previous30DaysTotal),
              })
            : this.i18n.t('dashboard.growth.comparedToPrevious'),
        dateRange: growthRange,
        chartPoints: growthPoints,
        xAxisLabels: growthLabels,
      },
      ordersTitle: this.i18n.t('dashboard.newestOrders'),
      viewAllOrdersLabel: this.i18n.t('notificationsPage.viewAllOrders'),
      newestOrders: normalizedOrders.slice(0, 5).map((order) => this.mapOrder(order)),
    };
  }

  private filterOrdersWithinDays(orders: AdminOrderRecord[], days: number): AdminOrderRecord[] {
    const start = new Date();
    start.setDate(start.getDate() - days);
    return orders.filter((order) => {
      const createdAt = this.dateValue(order.createdAt);
      return createdAt ? createdAt >= start : false;
    });
  }

  private filterOrdersWithinWindow(
    orders: AdminOrderRecord[],
    fromDaysAgo: number,
    toDaysAgo: number,
  ): AdminOrderRecord[] {
    const start = new Date();
    start.setDate(start.getDate() - toDaysAgo);
    const end = new Date();
    end.setDate(end.getDate() - fromDaysAgo);

    return orders.filter((order) => {
      const createdAt = this.dateValue(order.createdAt);
      return createdAt ? createdAt >= start && createdAt < end : false;
    });
  }

  private buildChartPoints(orders: AdminOrderRecord[]): string {
    const totalsByDay = new Map<string, number>();

    for (let dayOffset = 29; dayOffset >= 0; dayOffset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      totalsByDay.set(date.toISOString().slice(0, 10), 0);
    }

    for (const order of orders) {
      const key = String(order.createdAt ?? '').slice(0, 10);
      if (!totalsByDay.has(key)) continue;
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + 1);
    }

    const values = [...totalsByDay.values()];
    const maxValue = Math.max(...values, 1);

    return values
      .map((value, index) => {
        const x = Math.round((index / Math.max(values.length - 1, 1)) * 1000);
        const y = Math.round(120 - (value / maxValue) * 90);
        return `${x},${y}`;
      })
      .join(' ');
  }

  private buildGrowthLabels(): string[] {
    return [28, 24, 20, 16, 12, 8, 4, 0].map((daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return this.i18n.formatDate(date, { month: 'short', day: 'numeric' });
    });
  }

  private buildGrowthRange(): string {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const end = new Date();

    return `${this.i18n.formatDate(start, { day: '2-digit', month: 'short', year: 'numeric' })} - ${this.i18n.formatDate(end, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  private buildDashboardDateDisplay(): string {
    const start = new Date('2025-12-06');
    const end = new Date('2026-03-06');
    return `${this.i18n.formatDate(start, { day: '2-digit', month: 'short', year: 'numeric' })} - ${this.i18n.formatDate(end, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  private buildGoalLabels(goal: number): string[] {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
      this.i18n.formatNumber(goal * ratio, { notation: 'compact', maximumFractionDigits: 1 }),
    );
  }

  private buildSlides(): Slide[] {
    return [
      {
        image: '/carousel-1.png',
        title: this.i18n.t('dashboard.slides.whatsappTitle'),
        description: this.i18n.t('dashboard.slides.whatsappDescription'),
      },
      {
        image: '/carousel-2.png',
        title: this.i18n.t('dashboard.slides.cartsTitle'),
        description: this.i18n.t('dashboard.slides.cartsDescription'),
      },
      {
        image: '/carousel-3.webp',
        title: this.i18n.t('dashboard.slides.campaignsTitle'),
        description: this.i18n.t('dashboard.slides.campaignsDescription'),
      },
      {
        image: '/carousel-4.png',
        title: this.i18n.t('dashboard.slides.behaviorTitle'),
        description: this.i18n.t('dashboard.slides.behaviorDescription'),
      },
      {
        image: '/carousel-5.png',
        title: this.i18n.t('dashboard.slides.automationTitle'),
        description: this.i18n.t('dashboard.slides.automationDescription'),
      },
    ];
  }

  private percentageChange(current: number, previous: number): string {
    if (previous <= 0) return '+100%';
    const change = ((current - previous) / previous) * 100;
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(1)}%`;
  }

  private mapOrder(order: AdminOrderRecord): Order {
    const createdAt = this.dateValue(order.createdAt);
    const customerName = this.customerName(order);
    const customerMobile = this.customerPhone(order);
    const paymentMethod = this.paymentMethod(order);

    return {
      id: this.recordId(order),
      orderNumber: this.orderNumber(order),
      customerName,
      customerMobile,
      paymentMethod,
      paymentStatus: this.paymentStatus(order),
      paymentClass: this.paymentClass(paymentMethod),
      shippingLabel: this.shippingLabel(order),
      priceValue: this.i18n.formatNumber(this.orderAmount(order), { maximumFractionDigits: 2 }),
      priceCurrency: this.i18n.t('common.currency'),
      status: this.orderStatus(order),
      statusClass: this.orderStatusClass(order),
      createdDate: createdAt ? this.i18n.formatDate(createdAt, { dateStyle: 'medium' }) : '--',
      createdTime: createdAt
        ? this.i18n.formatDate(createdAt, { hour: '2-digit', minute: '2-digit' })
        : '--',
      actionLabel: this.i18n.t('dashboard.order.view'),
    };
  }

  private orderAmount(order: AdminOrderRecord): number {
    return Number(order.totalPrice ?? order.totalAmount ?? order.total ?? 0);
  }

  private orderNumber(order: AdminOrderRecord): string {
    const raw = (order.orderNumber ?? this.recordId(order)) || 'Order';
    const text = String(raw).trim();
    return text.startsWith('#') ? text : `#${text}`;
  }

  private paymentMethod(order: AdminOrderRecord): string {
    return (
      String(order.paymentMethod ?? this.i18n.t('dashboard.order.unknown')).trim() ||
      this.i18n.t('dashboard.order.unknown')
    );
  }

  private paymentStatus(order: AdminOrderRecord): string {
    return (
      String(order.paymentStatus ?? this.i18n.t('dashboard.order.pending')).trim() ||
      this.i18n.t('dashboard.order.pending')
    );
  }

  private paymentClass(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('apple')) return 'apple-pay';
    if (normalized.includes('bank')) return 'bank-transfer';
    if (normalized.includes('cash')) return 'cash';
    if (normalized.includes('card')) return 'card';
    return 'default';
  }

  private shippingLabel(order: AdminOrderRecord): string {
    if (order.shipping) return String(order.shipping);
    if (order.shippingAddress) return this.i18n.t('dashboard.order.shippingAddressProvided');
    return this.i18n.t('dashboard.order.shippingNotRequired');
  }

  private orderStatus(order: AdminOrderRecord): string {
    const fallback = this.i18n.t('dashboard.order.pending');
    return String(order.orderStatus ?? order.status ?? fallback).trim() || fallback;
  }

  private orderStatusClass(order: AdminOrderRecord): string {
    const normalized = this.orderStatus(order).toLowerCase();
    if (['new', 'pending'].includes(normalized)) return 'pending';
    if (['processing', 'confirmed', 'preparing'].includes(normalized)) return 'processing';
    if (['delivered', 'completed', 'paid'].includes(normalized)) return 'completed';
    if (['cancelled', 'canceled', 'failed', 'rejected'].includes(normalized)) return 'cancelled';
    return 'pending';
  }

  private customerName(order: AdminOrderRecord): string {
    const user = order.user;
    if (order.customer?.name) return order.customer.name;
    if (user && typeof user !== 'string' && user.name) return user.name;
    return this.i18n.t('dashboard.order.unknownCustomer');
  }

  private customerPhone(order: AdminOrderRecord): string {
    const user = order.user;
    if (order.customer?.phone) return order.customer.phone;
    if (user && typeof user !== 'string' && user.phone) return user.phone;
    if (order.customer?.email) return order.customer.email;
    if (user && typeof user !== 'string' && user.email) return user.email;
    return '--';
  }

  private dateValue(value: string | undefined): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private recordId(order: AdminOrderRecord): string {
    return order._id ?? order.id ?? '';
  }

  private fallbackOrders(): AdminOrderRecord[] {
    return ORDERS_DATA.map((order) => ({
      _id: order.id,
      id: order.id,
      orderNumber: order.orderNumber,
      source: order.source,
      customer: {
        name: order.customer,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      paymentMethod: order.payment,
      paymentStatus: order.paymentStatus,
      currency: order.currency,
      shipping: order.shipping,
      totalAmount: order.total,
      orderStatus: order.status,
      createdAt: order.createdDate,
      updatedAt: order.updatedDate,
      tags: order.tags,
    }));
  }
}
