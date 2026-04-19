import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MainContentComponent } from './dashboard';
import { DashboardService } from '../../services/dashboard.service';

const MOCK_DASHBOARD_DATA = {
  welcomeTitle: 'Welcome back to Salla',
  datePreset: 'Last 90 days',
  dateDisplay: '01 Jan, 2026 - 31 Mar, 2026',
  stats: [],
  slides: [],
  goals: {
    title: 'Track Goals',
    description: 'Track your progress',
    progressLabel: 'Progress',
    progressPercent: 0,
    progressLabels: ['0%', '25%', '50%', '75%', '100%'],
    currentOrders: 0,
    goal: 5000,
    ordersToGoal: 5000,
    editLabel: 'Edit goals',
    helpLabel: 'Get help',
  },
  growth: {
    title: 'Compare growth',
    totalValue: '0',
    totalLabel: 'Total orders',
    totalSubLabel: 'Compared to previous period',
    indicatorValue: 'Total orders',
    dateLabel: 'Date',
    datePreset: 'Last 30 days',
    dateRange: '01 Jan - 31 Mar, 2026',
    chartPoints: '0,0',
    xAxisLabels: [],
  },
  ordersTitle: 'Newest Orders',
  viewAllOrdersLabel: 'View all orders',
  newestOrders: [],
};

describe('MainContentComponent', () => {
  let component: MainContentComponent;
  let fixture: ComponentFixture<MainContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainContentComponent],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            getDashboardData: () => of(MOCK_DASHBOARD_DATA),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainContentComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
