import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { OrdersComponent } from './orders';
import { OrdersService } from './orders.service';
import { Order } from './orders.model';

const MOCK_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: '58332475',
    source: 'Store',
    customer: 'Test Customer',
    customerPhone: '1234567890',
    payment: 'Apple Pay',
    paymentStatus: 'Paid',
    shipping: "Doesn't Require Shipping",
    total: 10.5,
    currency: 'KWD',
    status: 'New',
    createdDate: '2025-09-27',
    updatedDate: '2025-09-27',
  },
];

describe('OrdersComponent', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideNoopAnimations(),
        {
          provide: OrdersService,
          useValue: {
            getOrders: () => of(MOCK_ORDERS),
            getTabs: () => [
              { key: 'all', label: 'All' },
              { key: 'New', label: 'New' },
            ],
            buildTabs: () => [
              { key: 'all', label: 'All' },
              { key: 'New', label: 'New' },
            ],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
