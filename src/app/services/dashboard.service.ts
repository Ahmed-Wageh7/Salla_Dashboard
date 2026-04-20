import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AdminApiService } from '../core/api/admin-api.service';
import { AdminOrderRecord } from '../core/api/admin.models';
import { DASHBOARD_DATA } from '../data/dashboard-data';

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

const DASHBOARD_MOCK: DashboardApiResponse = {
  welcomeTitle: 'Welcome back to Salla',
  datePreset: 'Last 90 days',
  dateDisplay: '06 Dec, 2025 - 06 Mar, 2026',
  stats: [
    {
      id: 'sales',
      label: 'Sales',
      value: '0',
      currency: 'ر.س',
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: 'View report',
    },
    {
      id: 'orders',
      label: 'Orders',
      value: '0',
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: 'View report',
    },
    {
      id: 'visits',
      label: 'Visits',
      value: '250',
      chartType: 'area',
      chartPoints: '0,40 50,38 100,25 150,30 200,20',
      reportLabel: 'View report',
    },
    {
      id: 'conversion',
      label: 'Conversion',
      value: '0.00%',
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: 'View report',
    },
  ],
  slides: [
    {
      image: '/carousel-1.png',
      title: 'Communicate and target right with Salla WhatsApp',
      description:
        'Connect your store to WhatsApp and stay closer to customers with automated messages.',
    },
    {
      image: '/carousel-2.png',
      title: 'Recover abandoned carts with smart reminders',
      description:
        'Send personalized reminders at the right time to bring visitors back and increase orders.',
    },
    {
      image: '/carousel-3.webp',
      title: 'Launch campaign offers in minutes',
      description:
        'Create targeted offers and distribute them across channels from one dashboard view.',
    },
    {
      image: '/carousel-4.png',
      title: 'Track customer behavior and optimize journeys',
      description:
        'See where users drop off and improve your store funnel with actionable recommendations.',
    },
    {
      image: '/carousel-5.png',
      title: 'Scale faster with marketing automation',
      description:
        'Automate recurring notifications and promotions to grow your revenue with less manual work.',
    },
  ],
  goals: {
    title: 'Track your goals',
    description:
      "Setting order goals helps us provide personalized recommendations and insights to boost your business performance. We'll track your progress and suggest actionable steps to reach your targets.",
    progressLabel: 'Progress towards your goal',
    progressPercent: 0,
    progressLabels: ['0k', '1.3k', '2.5k', '3.8k', '5.0k'],
    currentOrders: 0,
    goal: 5000,
    ordersToGoal: 5000,
    editLabel: 'Edit goals',
    helpLabel: 'Get help to achieve your goals',
  },
  growth: {
    title: 'Compare your growth',
    totalValue: '0',
    totalLabel: 'orders',
    totalSubLabel: 'Total orders',
    indicatorValue: 'Total orders',
    dateLabel: 'Select date',
    datePreset: 'Last 30 days',
    dateRange: '04 Feb - 06 Mar, 2026',
    chartPoints:
      '0,100 50,100 100,100 150,100 200,100 250,100 300,100 350,100 400,100 450,100 500,100 550,100 600,100 650,100 700,100 750,100 800,100 850,100 900,100 950,100 1000,100',
    xAxisLabels: [
      'Feb 6, 2026',
      'Feb 8, 2026',
      'Feb 10, 2026',
      'Feb 12, 2026',
      'Feb 14, 2026',
      'Feb 16, 2026',
      'Feb 18, 2026',
      'Feb 20, 2026',
      'Feb 22, 2026',
      'Feb 24, 2026',
      'Feb 26, 2026',
      'Feb 28, 2026',
      'Mar 2, 2026',
      'Mar 4, 2026',
      'Mar 6, 2026',
    ],
  },
  ordersTitle: 'Newest orders',
  viewAllOrdersLabel: 'View all orders',
  newestOrders: [
    {
      id: '58332475',
      orderNumber: '#58332475',
      customerName: 'علي الشمري',
      customerMobile: '96599521252',
      paymentMethod: 'Apple Pay',
      paymentStatus: 'Paid',
      paymentClass: 'apple-pay',
      shippingLabel: "Doesn't Require Shipping",
      priceValue: '8.149',
      priceCurrency: 'KWD',
      status: 'New',
      statusClass: 'new',
      createdDate: '2025-09-27',
      createdTime: '07:50 am',
      actionLabel: 'View',
    },
    {
      id: '58278453',
      orderNumber: '#58278453',
      customerName: 'راشد المري',
      customerMobile: '966546788700',
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Pending',
      paymentClass: 'bank-transfer',
      shippingLabel: "Doesn't Require Shipping",
      priceValue: '100',
      priceCurrency: 'ر.س',
      status: 'New',
      statusClass: 'new',
      createdDate: '2025-09-26',
      createdTime: '10:51 am',
      actionLabel: 'View',
    },
    {
      id: '58128293',
      orderNumber: '#58128293',
      customerName: 'Waqas',
      customerMobile: '+919537612458',
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Pending',
      paymentClass: 'bank-transfer',
      shippingLabel: "Doesn't Require Shipping",
      priceValue: '10.251',
      priceCurrency: 'OMR',
      status: 'New',
      statusClass: 'new',
      createdDate: '2025-09-23',
      createdTime: '07:33 pm',
      actionLabel: 'View',
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly adminApi = inject(AdminApiService);

  getDashboardData(): Observable<DashboardApiResponse> {
    return this.adminApi.getAdminOrders().pipe(
      map((orders) => this.buildDashboardData(orders)),
      catchError(() => of(this.buildDashboardData([]))),
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

    return {
      ...DASHBOARD_DATA,
      stats: DASHBOARD_DATA.stats.map((stat) => {
        if (stat.id === 'orders') {
          return { ...stat, value: totalOrders.toLocaleString() };
        }

        if (stat.id === 'sales') {
          return { ...stat, value: totalSales.toLocaleString(undefined, { maximumFractionDigits: 2 }) };
        }

        return stat;
      }),
      goals: {
        ...DASHBOARD_DATA.goals,
        currentOrders: totalOrders,
        ordersToGoal: Math.max(0, DASHBOARD_DATA.goals.goal - totalOrders),
      },
      growth: {
        ...DASHBOARD_DATA.growth,
        totalValue: totalOrders.toLocaleString(),
      },
      newestOrders: normalizedOrders.slice(0, 5).map((order) => this.mapOrder(order)),
    };
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
      priceValue: this.orderAmount(order).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      priceCurrency: order.currency || 'SAR',
      status: this.orderStatus(order),
      statusClass: this.orderStatusClass(order),
      createdDate: createdAt ? createdAt.toLocaleDateString() : '--',
      createdTime: createdAt
        ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--',
      actionLabel: 'View',
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
    return String(order.paymentMethod ?? 'Unknown').trim() || 'Unknown';
  }

  private paymentStatus(order: AdminOrderRecord): string {
    return String(order.paymentStatus ?? 'Pending').trim() || 'Pending';
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
    if (order.shippingAddress) return 'Shipping address provided';
    return "Doesn't Require Shipping";
  }

  private orderStatus(order: AdminOrderRecord): string {
    return String(order.orderStatus ?? order.status ?? 'Pending').trim() || 'Pending';
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
    return 'Unknown customer';
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
}
