import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardApiResponse, DashboardService } from '../../services/dashboard.service';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  DashboardDataService,
  LiveVisitor,
  Product,
  Review,
  ReviewStats,
  SalesChannel,
} from './dashboard-data.service';

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

@Component({
  selector: 'app-main-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class MainContentComponent implements OnInit {
  readonly i18n = inject(TranslationService);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly dashboardData = signal<DashboardData | null>(null);
  private readonly dashboardService = inject(DashboardService);
  private readonly dashboardDataService = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);
  private hasLoadedOnce = false;
  private lastLanguage = this.i18n.language();

  stats: StatCard[] = [
    {
      id: 'sales',
      label: this.i18n.t('dashboard.stats.sales'),
      value: '0',
      currency: this.i18n.t('common.currency'),
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: this.i18n.t('dashboard.stats.report'),
    },
    {
      id: 'orders',
      label: this.i18n.t('dashboard.stats.orders'),
      value: '0',
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: this.i18n.t('dashboard.stats.report'),
    },
    {
      id: 'visits',
      label: this.i18n.t('dashboard.stats.visits'),
      value: '250',
      chartType: 'area',
      chartPoints: '0,40 50,38 100,25 150,30 200,20',
      reportLabel: this.i18n.t('dashboard.stats.report'),
    },
    {
      id: 'conversion',
      label: this.i18n.t('dashboard.stats.conversion'),
      value: '0.00%',
      chartType: 'line',
      chartPoints: '0,35 40,30 80,32 120,25 160,28 200,20',
      reportLabel: this.i18n.t('dashboard.stats.report'),
    },
  ];

  readonly slides = signal<Slide[]>([
    {
      image: 'carousel-1.png',
      title: this.i18n.t('dashboard.slides.whatsappTitle'),
      description: this.i18n.t('dashboard.slides.whatsappDescription'),
    },
    {
      image: 'carousel-2.png',
      title: this.i18n.t('dashboard.slides.cartsTitle'),
      description: this.i18n.t('dashboard.slides.cartsDescription'),
    },
    {
      image: 'carousel-3.webp',
      title: this.i18n.t('dashboard.slides.campaignsTitle'),
      description: this.i18n.t('dashboard.slides.campaignsDescription'),
    },
    {
      image: 'carousel-4.png',
      title: this.i18n.t('dashboard.slides.behaviorTitle'),
      description: this.i18n.t('dashboard.slides.behaviorDescription'),
    },
    {
      image: 'carousel-5.png',
      title: this.i18n.t('dashboard.slides.automationTitle'),
      description: this.i18n.t('dashboard.slides.automationDescription'),
    },
  ]);

  readonly currentIndex = signal(0);
  readonly currentSlide = computed(() => this.slides()[this.currentIndex()] ?? null);

  readonly goals = signal<GoalsData>({
    title: this.i18n.t('dashboard.goals.title'),
    description: this.i18n.t('dashboard.goals.description'),
    progressLabel: this.i18n.t('dashboard.goals.progressLabel'),
    progressPercent: 0,
    progressLabels: ['0%', '25%', '50%', '75%', '100%'],
    currentOrders: 0,
    goal: 5000,
    ordersToGoal: 5000,
    editLabel: this.i18n.t('dashboard.goals.edit'),
    helpLabel: this.i18n.t('dashboard.goals.help'),
  });

  growth: GrowthData = {
    title: this.i18n.t('dashboard.growth.title'),
    totalValue: '0',
    totalLabel: this.i18n.t('dashboard.growth.totalLabel'),
    totalSubLabel: this.i18n.t('dashboard.growth.comparedToPrevious'),
    indicatorValue: this.i18n.t('dashboard.growth.indicatorValue'),
    dateLabel: this.i18n.t('dashboard.growth.dateLabel'),
    datePreset: this.i18n.t('dashboard.growth.datePreset'),
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
      priceCurrency: 'ريال',
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
      priceCurrency: 'ريال',
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
      priceCurrency: 'ريال',
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
  noDataMessage = this.i18n.t('dashboard.noSalesData');

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

  constructor() {
    effect(() => {
      const language = this.i18n.language();
      if (this.hasLoadedOnce && language !== this.lastLanguage) {
        this.lastLanguage = language;
        this.loadDashboardData();
        return;
      }

      this.lastLanguage = language;
    });
  }

  ngOnInit(): void {
    this.hasLoadedOnce = true;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService
      .getDashboardData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
        this.loadMockData();

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.i18n.t('dashboard.loadError'));
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
    this.dashboardDataService
      .getSalesChannelsByPeriod(this.selectedChannelPeriod())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (channels) => {
          this.salesChannels.set(channels);
          this.isLoadingChannels.set(false);
        },
        error: () => {
          this.salesChannels.set([]);
          this.isLoadingChannels.set(false);
        },
      });
  }

  loadLiveVisitors(): void {
    this.isLoadingVisitors.set(true);
    this.dashboardDataService
      .getLiveVisitors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (visitors) => {
          this.liveVisitors.set(visitors);
          this.totalLiveVisitors.set(visitors.reduce((sum, visitor) => sum + visitor.visitors, 0));
          this.isLoadingVisitors.set(false);
        },
        error: () => {
          this.liveVisitors.set([]);
          this.totalLiveVisitors.set(0);
          this.isLoadingVisitors.set(false);
        },
      });
  }

  loadReviewStats(): void {
    this.isLoadingReviews.set(true);
    this.dashboardDataService
      .getReviewStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.reviewStats.set(stats);
          this.loadRecentReviews();
        },
        error: () => {
          this.reviewStats.set({
            totalReviews: 0,
            publishedReviews: 0,
            pendingReviews: 0,
            averageRating: 0,
          });
          this.recentReviews.set([]);
          this.isLoadingReviews.set(false);
        },
      });
  }

  loadBestSellingProducts(): void {
    this.isLoadingProducts.set(true);
    this.dashboardDataService
      .getBestSellingProducts(5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.bestSellingProducts.set(products);
          this.isLoadingProducts.set(false);
        },
        error: () => {
          this.bestSellingProducts.set([]);
          this.isLoadingProducts.set(false);
        },
      });
  }

  private loadRecentReviews(): void {
    this.dashboardDataService
      .getReviews(undefined, 3)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviews) => {
          this.recentReviews.set(reviews);
          this.isLoadingReviews.set(false);
        },
        error: () => {
          this.recentReviews.set([]);
          this.isLoadingReviews.set(false);
        },
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
      'in-stock': this.i18n.t('dashboard.stock.inStock', {
        count: this.i18n.formatNumber(product.stock),
      }),
      'low-stock': this.i18n.t('dashboard.stock.lowStock', {
        count: this.i18n.formatNumber(product.stock),
      }),
      'out-of-stock': this.i18n.t('dashboard.stock.outOfStock'),
      unlimited: this.i18n.t('dashboard.stock.unlimited'),
    };
    return labels[product.stockStatus] || this.i18n.t('dashboard.order.unknown');
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
}
