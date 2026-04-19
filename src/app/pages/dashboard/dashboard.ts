import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  CurrencyFormatPipe,
  NumberFormatPipe,
  StarRatingPipe,
  TruncatePipe,
} from './dashboard-pipes';
import { DashboardApiResponse, DashboardService } from '../../services/dashboard.service';

interface StatCard {
  id: 'sales' | 'orders' | 'visits' | 'conversion';
  label: string;
  value: string;
  currency?: string;
  chartType: 'line' | 'area';
  chartPoints: string;
  reportLabel: string;
}

interface DashboardData {
  welcomeTitle: string;
  datePreset: string;
  dateDisplay: string;
  ordersTitle: string;
  viewAllOrdersLabel: string;
}

interface GoalsData {
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

interface GrowthData {
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

interface Slide {
  image: string;
  title: string;
  description: string;
}

interface Order {
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  paymentMethod: string;
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

interface SalesChannel {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface LiveVisitor {
  id: string;
  city: string;
  cityAr: string;
  lat: number;
  lng: number;
  visitors: number;
}

interface ReviewStats {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  averageRating: number;
}

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  status: 'published' | 'pending';
}

interface Product {
  id: string;
  name: string;
  image?: string;
  status: 'published' | 'hidden' | 'out-of-stock';
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' | 'unlimited';
  sales: number;
  price: number;
}

@Component({
  selector: 'app-main-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TitleCasePipe,
    NumberFormatPipe,
    CurrencyFormatPipe,
    StarRatingPipe,
    TruncatePipe,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class MainContentComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly dashboardData = signal<DashboardData | null>(null);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  stats: StatCard[] = [
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
  ];

  readonly slides = signal<Slide[]>([
    {
      image: 'carousel-1.png',
      title: 'Sell directly on WhatsApp',
      description: 'Turn chats into checkouts with one smooth purchase flow.',
    },
    {
      image: 'carousel-2.png',
      title: 'Recover abandoned carts faster',
      description: 'Send smart reminders and recover lost revenue in minutes.',
    },
    {
      image: 'carousel-3.webp',
      title: 'Engage repeat customers',
      description: 'Run targeted campaigns and increase returning buyers.',
    },
    {
      image: 'carousel-4.png',
      title: 'Automate support responses',
      description: 'Keep response time low and customer satisfaction high.',
    },
    {
      image: 'carousel-5.png',
      title: 'Launch campaigns quickly',
      description: 'Create and publish offers in a few clicks.',
    },
  ]);

  readonly currentIndex = signal(0);
  readonly currentSlide = computed(() => this.slides()[this.currentIndex()] ?? null);

  readonly goals = signal<GoalsData>({
    title: 'Track Goals',
    description: 'Track your progress and keep your sales goals on target.',
    progressLabel: 'Progress',
    progressPercent: 0,
    progressLabels: ['0%', '25%', '50%', '75%', '100%'],
    currentOrders: 0,
    goal: 5000,
    ordersToGoal: 5000,
    editLabel: 'Edit goals',
    helpLabel: 'Get help',
  });

  growth: GrowthData = {
    title: 'Compare growth',
    totalValue: '0',
    totalLabel: 'Total orders',
    totalSubLabel: 'Compared to previous period',
    indicatorValue: 'Total orders',
    dateLabel: 'Date',
    datePreset: 'Last 30 days',
    dateRange: '04 Feb - 06 Mar, 2026',
    chartPoints: '0,120 120,112 240,116 360,108 480,110 600,104 720,102 840,98 1000,96',
    xAxisLabels: ['4 Feb', '8 Feb', '12 Feb', '16 Feb', '20 Feb', '24 Feb', '28 Feb', '6 Mar'],
  };

  newestOrders: Order[] = [
    {
      orderNumber: '#58332475',
      customerName: 'علي الشمري',
      customerMobile: '96599521252',
      paymentMethod: 'Apple Pay',
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
      orderNumber: '#58278453',
      customerName: 'راشد المري',
      customerMobile: '966546788700',
      paymentMethod: 'Bank Transfer',
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
      orderNumber: '#58128293',
      customerName: 'Waqas',
      customerMobile: '+919537612458',
      paymentMethod: 'Bank Transfer',
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
  ];

  readonly salesChannels = signal<SalesChannel[]>([]);
  readonly isLoadingChannels = signal(false);
  readonly selectedChannelPeriod = signal<'day' | 'week' | 'month' | 'year'>('month');
  noDataMessage = 'No sales data available for this period';

  readonly liveVisitors = signal<LiveVisitor[]>([]);
  readonly totalLiveVisitors = signal(0);
  readonly isLoadingVisitors = signal(false);
  readonly mapZoom = signal(1);

  readonly reviewStats = signal<ReviewStats>({
    totalReviews: 0,
    publishedReviews: 0,
    pendingReviews: 0,
    averageRating: 0,
  });
  readonly recentReviews = signal<Review[]>([]);
  readonly isLoadingReviews = signal(false);

  readonly bestSellingProducts = signal<Product[]>([]);
  readonly isLoadingProducts = signal(false);

  private cityCoordinates: { [key: string]: { x: number; y: number } } = {
    Riyadh: { x: 200, y: 180 },
    Jeddah: { x: 100, y: 200 },
    Dammam: { x: 320, y: 140 },
    Madinah: { x: 120, y: 160 },
    Doha: { x: 340, y: 220 },
    Manama: { x: 360, y: 180 },
    Buraydah: { x: 180, y: 140 },
    Hail: { x: 160, y: 100 },
    Khaybar: { x: 100, y: 120 },
    'Hafar Al Batin': { x: 280, y: 80 },
  };

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearPendingTimers());
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.dashboardData.set({
          welcomeTitle: data.welcomeTitle,
          datePreset: data.datePreset,
          dateDisplay: data.dateDisplay,
          ordersTitle: data.ordersTitle,
          viewAllOrdersLabel: data.viewAllOrdersLabel,
        });

        this.stats = data.stats;
        this.slides.set(data.slides);
        if (this.currentIndex() >= data.slides.length) {
          this.currentIndex.set(0);
        }
        this.goals.set({
          ...data.goals,
          progressPercent:
            data.goals.goal > 0
              ? Math.round((data.goals.currentOrders / data.goals.goal) * 100)
              : 0,
          ordersToGoal: Math.max(0, data.goals.goal - data.goals.currentOrders),
        });
        this.growth = data.growth;
        this.newestOrders = data.newestOrders;

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load dashboard data. Please try again.');
        this.isLoading.set(false);
        this.loadMockData();
      },
    });
  }

  goToSlide(index: number): void {
    if (index < 0 || index >= this.slides().length) return;
    this.currentIndex.set(index);
  }

  nextSlide(): void {
    const totalSlides = this.slides().length;
    if (!totalSlides) return;

    this.currentIndex.update((current) => (current + 1) % totalSlides);
  }

  prevSlide(): void {
    const totalSlides = this.slides().length;
    if (!totalSlides) return;

    this.currentIndex.update((current) => (current - 1 + totalSlides) % totalSlides);
  }

  loadMockData(): void {
    this.loadSalesChannels();
    this.loadLiveVisitors();
    this.loadReviewStats();
    this.loadBestSellingProducts();
  }

  loadSalesChannels(): void {
    this.isLoadingChannels.set(true);

    this.queueDelayedUpdate(800, () => {
      this.salesChannels.set([]);
      this.isLoadingChannels.set(false);
    });
  }

  loadLiveVisitors(): void {
    this.isLoadingVisitors.set(true);

    this.queueDelayedUpdate(500, () => {
      const visitors: LiveVisitor[] = [
        { id: '1', city: 'Riyadh', cityAr: 'الرياض', lat: 24.7136, lng: 46.6753, visitors: 45 },
        { id: '2', city: 'Jeddah', cityAr: 'جدة', lat: 21.4858, lng: 39.1925, visitors: 32 },
        { id: '3', city: 'Dammam', cityAr: 'الدمام', lat: 26.3927, lng: 50.0916, visitors: 18 },
        {
          id: '4',
          city: 'Madinah',
          cityAr: 'المدينة المنورة',
          lat: 24.5247,
          lng: 39.5692,
          visitors: 12,
        },
        { id: '5', city: 'Doha', cityAr: 'الدوحة', lat: 25.2854, lng: 51.531, visitors: 8 },
        { id: '6', city: 'Manama', cityAr: 'المنامة', lat: 26.2285, lng: 50.586, visitors: 5 },
        { id: '7', city: 'Buraydah', cityAr: 'بريدة', lat: 26.3333, lng: 43.9667, visitors: 3 },
        { id: '8', city: 'Hail', cityAr: 'حائل', lat: 27.5114, lng: 41.7208, visitors: 2 },
        { id: '9', city: 'Khaybar', cityAr: 'خيبر', lat: 25.6934, lng: 39.2926, visitors: 1 },
        {
          id: '10',
          city: 'Hafar Al Batin',
          cityAr: 'حفر الباطن',
          lat: 28.4328,
          lng: 45.9708,
          visitors: 1,
        },
      ];

      this.liveVisitors.set(visitors);
      this.totalLiveVisitors.set(visitors.reduce((sum, v) => sum + v.visitors, 0));
      this.isLoadingVisitors.set(false);
    });
  }

  loadReviewStats(): void {
    this.isLoadingReviews.set(true);

    this.queueDelayedUpdate(400, () => {
      this.reviewStats.set({
        totalReviews: 128,
        publishedReviews: 115,
        pendingReviews: 13,
        averageRating: 4.6,
      });

      this.recentReviews.set([
        {
          id: '1',
          customerName: 'Ahmed Al-Saud',
          rating: 5,
          comment:
            'Excellent product! Fast delivery and great quality. Will definitely order again.',
          productName: 'Demo Voucher Product',
          date: '2025-03-05',
          status: 'published',
        },
        {
          id: '2',
          customerName: 'Fatima Al-Rashid',
          rating: 4,
          comment:
            'Good quality, but packaging could be better. Overall satisfied with the purchase.',
          productName: 'Demo Single Product',
          date: '2025-03-04',
          status: 'published',
        },
        {
          id: '3',
          customerName: 'Mohammed Khan',
          rating: 5,
          comment: 'Amazing experience! Will buy again for sure. Highly recommended!',
          productName: 'Demo Grouped Product',
          date: '2025-03-03',
          status: 'pending',
        },
      ]);

      this.isLoadingReviews.set(false);
    });
  }

  loadBestSellingProducts(): void {
    this.isLoadingProducts.set(true);

    this.queueDelayedUpdate(700, () => {
      this.bestSellingProducts.set([
        {
          id: '1',
          name: 'Demo Grouped Product',
          status: 'hidden',
          stock: 0,
          stockStatus: 'unlimited',
          sales: 245,
          price: 150,
        },
        {
          id: '2',
          name: 'Demo Single Product',
          status: 'hidden',
          stock: 20000,
          stockStatus: 'in-stock',
          sales: 189,
          price: 99,
        },
        {
          id: '3',
          name: 'Demo Voucher Product',
          status: 'published',
          stock: 1,
          stockStatus: 'low-stock',
          sales: 156,
          price: 50,
        },
      ]);
      this.isLoadingProducts.set(false);
    });
  }

  toggleChannelPeriod(): void {
    const periods: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
    const currentIndex = periods.indexOf(this.selectedChannelPeriod());
    this.selectedChannelPeriod.set(periods[(currentIndex + 1) % periods.length]);
    this.loadSalesChannels();
  }

  getTotalChannelSales(): number {
    return this.salesChannels().reduce((sum, channel) => sum + channel.value, 0);
  }

  onViewChannelReport(): void {
    console.log('Viewing channel report...');
  }

  getCityX(cityName: string): number {
    return this.cityCoordinates[cityName]?.x || 200;
  }

  getCityY(cityName: string): number {
    return this.cityCoordinates[cityName]?.y || 150;
  }

  zoomIn(): void {
    this.mapZoom.update((zoom) => Math.min(zoom + 0.2, 2));
  }

  zoomOut(): void {
    this.mapZoom.update((zoom) => Math.max(zoom - 0.2, 0.5));
  }

  onViewAnalytics(): void {
    console.log('Viewing analytics...');
  }

  onManageReviews(): void {
    console.log('Managing reviews...');
  }

  getStockLabel(product: Product): string {
    const labels: { [key: string]: string } = {
      'in-stock': `${product.stock.toLocaleString()} In stock`,
      'low-stock': `${product.stock} In stock`,
      'out-of-stock': 'Out of stock',
      unlimited: 'Unlimited In stock',
    };
    return labels[product.stockStatus] || 'Unknown';
  }

  getStockColor(status: Product['stockStatus']): string {
    const colors: { [key: string]: string } = {
      'in-stock': '#10B981',
      'low-stock': '#F59E0B',
      'out-of-stock': '#EF4444',
      unlimited: '#8B5CF6',
    };
    return colors[status] || '#6B7280';
  }

  onViewAllProducts(): void {
    console.log('Viewing all products...');
  }

  private queueDelayedUpdate(delayMs: number, callback: () => void): void {
    const timeoutId = setTimeout(() => {
      this.pendingTimers.delete(timeoutId);
      callback();
    }, delayMs);

    this.pendingTimers.add(timeoutId);
  }

  private clearPendingTimers(): void {
    for (const timeoutId of this.pendingTimers) {
      clearTimeout(timeoutId);
    }

    this.pendingTimers.clear();
  }
}
