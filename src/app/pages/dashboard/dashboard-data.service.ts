import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay } from 'rxjs/operators';

// ==================== INTERFACES ====================

export interface SalesChannel {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface LiveVisitor {
  id: string;
  city: string;
  cityAr: string;
  lat: number;
  lng: number;
  visitors: number;
}

export interface ReviewStats {
  totalReviews: number;
  publishedReviews: number;
  pendingReviews: number;
  averageRating: number;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName: string;
  date: string;
  status: 'published' | 'pending';
}

export interface Product {
  id: string;
  name: string;
  image?: string;
  status: 'published' | 'hidden' | 'out-of-stock';
  stock: number;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' | 'unlimited';
  sales: number;
  price: number;
}

export interface DashboardStats {
  sales: number;
  orders: number;
  visits: number;
  conversion: number;
}

// ==================== MOCK DATA ====================

const MOCK_SALES_CHANNELS: SalesChannel[] = [
  { id: '1', name: 'Online Store', value: 12500, percentage: 65, color: '#8B5CF6' },
  { id: '2', name: 'Social Media', value: 4500, percentage: 23, color: '#10B981' },
  { id: '3', name: 'Marketplace', value: 2300, percentage: 12, color: '#F59E0B' },
];

const MOCK_LIVE_VISITORS: LiveVisitor[] = [
  { id: '1', city: 'Riyadh', cityAr: 'الرياض', lat: 24.7136, lng: 46.6753, visitors: 45 },
  { id: '2', city: 'Jeddah', cityAr: 'جدة', lat: 21.4858, lng: 39.1925, visitors: 32 },
  { id: '3', city: 'Dammam', cityAr: 'الدمام', lat: 26.3927, lng: 50.0916, visitors: 18 },
  { id: '4', city: 'Madinah', cityAr: 'المدينة المنورة', lat: 24.5247, lng: 39.5692, visitors: 12 },
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

const MOCK_REVIEW_STATS: ReviewStats = {
  totalReviews: 128,
  publishedReviews: 115,
  pendingReviews: 13,
  averageRating: 4.6,
};

const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    customerName: 'Ahmed Al-Saud',
    rating: 5,
    comment: 'Excellent product! Fast delivery.',
    productName: 'Demo Voucher Product',
    date: '2025-03-05',
    status: 'published',
  },
  {
    id: '2',
    customerName: 'Fatima Al-Rashid',
    rating: 4,
    comment: 'Good quality, but packaging could be better.',
    productName: 'Demo Single Product',
    date: '2025-03-04',
    status: 'published',
  },
  {
    id: '3',
    customerName: 'Mohammed Khan',
    rating: 5,
    comment: 'Amazing experience! Will buy again.',
    productName: 'Demo Grouped Product',
    date: '2025-03-03',
    status: 'pending',
  },
];

const MOCK_PRODUCTS: Product[] = [
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
  {
    id: '4',
    name: 'Premium Package',
    status: 'published',
    stock: 500,
    stockStatus: 'in-stock',
    sales: 98,
    price: 299,
  },
  {
    id: '5',
    name: 'Starter Kit',
    status: 'published',
    stock: 0,
    stockStatus: 'out-of-stock',
    sales: 76,
    price: 75,
  },
];

// ==================== SERVICE ====================

@Injectable({
  providedIn: 'root',
})
export class DashboardDataService {
  // BehaviorSubjects for real-time data simulation
  private liveVisitorsSubject = new BehaviorSubject<number>(0);
  private salesChannelsSubject = new BehaviorSubject<SalesChannel[]>([]);

  liveVisitors$ = this.liveVisitorsSubject.asObservable();
  salesChannels$ = this.salesChannelsSubject.asObservable();

  // Simulate real-time visitor updates
  private visitorInterval: any;

  constructor() {
    this.startLiveSimulation();
  }

  // ==================== SALES CHANNELS ====================

  getSalesChannels(): Observable<SalesChannel[]> {
    // Simulate API call with delay
    return of(MOCK_SALES_CHANNELS).pipe(delay(800));
  }

  getSalesChannelsByPeriod(period: 'day' | 'week' | 'month' | 'year'): Observable<SalesChannel[]> {
    // Return different data based on period
    const multiplier =
      period === 'day' ? 0.1 : period === 'week' ? 0.3 : period === 'month' ? 1 : 12;
    const adjustedData = MOCK_SALES_CHANNELS.map((channel) => ({
      ...channel,
      value: Math.round(channel.value * multiplier * (0.8 + Math.random() * 0.4)),
    }));
    return of(adjustedData).pipe(delay(600));
  }

  // ==================== LIVE VISITORS ====================

  getLiveVisitors(): Observable<LiveVisitor[]> {
    return of(MOCK_LIVE_VISITORS).pipe(delay(500));
  }

  getTotalLiveVisitors(): Observable<number> {
    const total = MOCK_LIVE_VISITORS.reduce((sum, v) => sum + v.visitors, 0);
    return of(total).pipe(delay(300));
  }

  private startLiveSimulation(): void {
    // Simulate real-time updates every 5 seconds
    this.visitorInterval = setInterval(() => {
      const currentVisitors = this.liveVisitorsSubject.value;
      const change = Math.floor(Math.random() * 10) - 5; // -5 to +5
      const newVisitors = Math.max(0, currentVisitors + change);
      this.liveVisitorsSubject.next(newVisitors);
    }, 5000);
  }

  stopLiveSimulation(): void {
    if (this.visitorInterval) {
      clearInterval(this.visitorInterval);
    }
  }

  // ==================== REVIEWS ====================

  getReviewStats(): Observable<ReviewStats> {
    return of(MOCK_REVIEW_STATS).pipe(delay(400));
  }

  getReviews(status?: 'published' | 'pending', limit: number = 10): Observable<Review[]> {
    let filtered = MOCK_REVIEWS;
    if (status) {
      filtered = MOCK_REVIEWS.filter((r) => r.status === status);
    }
    return of(filtered.slice(0, limit)).pipe(delay(600));
  }

  approveReview(reviewId: string): Observable<boolean> {
    // Simulate API call
    console.log(`Approving review: ${reviewId}`);
    return of(true).pipe(delay(500));
  }

  deleteReview(reviewId: string): Observable<boolean> {
    console.log(`Deleting review: ${reviewId}`);
    return of(true).pipe(delay(500));
  }

  // ==================== PRODUCTS ====================

  getBestSellingProducts(limit: number = 5): Observable<Product[]> {
    const sorted = [...MOCK_PRODUCTS].sort((a, b) => b.sales - a.sales);
    return of(sorted.slice(0, limit)).pipe(delay(700));
  }

  getProductsByStatus(status: 'published' | 'hidden' | 'all'): Observable<Product[]> {
    let filtered = MOCK_PRODUCTS;
    if (status !== 'all') {
      filtered = MOCK_PRODUCTS.filter((p) => p.status === status);
    }
    return of(filtered).pipe(delay(500));
  }

  updateProductStatus(productId: string, status: 'published' | 'hidden'): Observable<boolean> {
    console.log(`Updating product ${productId} status to ${status}`);
    return of(true).pipe(delay(400));
  }

  // ==================== UTILITY ====================

  getStockStatusLabel(status: Product['stockStatus']): string {
    const labels: Record<string, string> = {
      'in-stock': 'In stock',
      'low-stock': 'Low stock',
      'out-of-stock': 'Out of stock',
      unlimited: 'Unlimited',
    };
    return labels[status] || status;
  }

  getStockStatusColor(status: Product['stockStatus']): string {
    const colors: Record<string, string> = {
      'in-stock': '#10B981',
      'low-stock': '#F59E0B',
      'out-of-stock': '#EF4444',
      unlimited: '#8B5CF6',
    };
    return colors[status] || '#6B7280';
  }
}
