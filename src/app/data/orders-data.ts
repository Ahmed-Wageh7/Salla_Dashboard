import { Order } from '../pages/orders/orders.model';

const STATUSES: Order['status'][] = [
  'New',
  'Preparing',
  'Ready',
  'In delivery',
  'Completed',
  'Cancelled',
  'Processing reverse',
  'Partially Reversed',
  'Reversed',
];

const PAYMENTS: Order['payment'][] = [
  'Apple Pay',
  'Bank Transfer',
  'Cash on Delivery',
  'Credit Card',
  'STC Pay',
];
const SHIPPING = ["Doesn't Require Shipping", 'Fast', 'مندوب'];
const CURRENCIES = ['ريال'];
const CUSTOMERS = [
  'Ahmed Al-Mutairi',
  'Sara Mohamed',
  'Yousef Al-Harbi',
  'Maha Al-Fayez',
  'Lama Al-Otaibi',
  'Salem Al-Qahtani',
  'Fahad Al-Shehri',
  'Nasser Al-Rashid',
  'Rawan Abdullah',
  'Mariam Ali',
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function paymentStatusFor(status: Order['status']): Order['paymentStatus'] {
  if (['Cancelled', 'Processing reverse', 'Partially Reversed'].includes(status)) {
    return 'Refunded';
  }
  if (status === 'New') {
    return 'Unpaid';
  }
  return 'Paid';
}

function generateOrders(total: number): Order[] {
  const base: Order[] = [
    {
      id: '1',
      orderNumber: '58332475',
      source: 'Store',
      customer: 'علي الشمري',
      customerPhone: '96599521252',
      payment: 'Apple Pay',
      paymentStatus: 'Paid',
      shipping: "Doesn't Require Shipping",
      total: 8.149,
      currency: 'ريال',
      status: 'New',
      createdDate: '2025-09-27',
      updatedDate: '2025-09-27',
    },
    {
      id: '2',
      orderNumber: '58278453',
      source: 'Store',
      customer: 'راشد المري',
      customerPhone: '966546788700',
      payment: 'Bank Transfer',
      paymentStatus: 'Unpaid',
      shipping: "Doesn't Require Shipping",
      total: 100,
      currency: 'ريال',
      status: 'New',
      createdDate: '2025-09-26',
      updatedDate: '2025-09-26',
    },
    {
      id: '3',
      orderNumber: '58128293',
      source: 'Store',
      customer: 'Waqas',
      customerPhone: '+919537612458',
      payment: 'Bank Transfer',
      paymentStatus: 'Unpaid',
      shipping: "Doesn't Require Shipping",
      total: 10.251,
      currency: 'ريال',
      status: 'New',
      createdDate: '2025-09-23',
      updatedDate: '2025-09-23',
    },
  ];

  const orders: Order[] = [...base];
  const startDate = new Date('2025-06-14');

  for (let i = base.length + 1; i <= total; i++) {
    const status = STATUSES[i % STATUSES.length];
    const payment = PAYMENTS[i % PAYMENTS.length];
    const source = i % 5 === 0 ? 'Manual' : i % 7 === 0 ? 'App' : 'Store';

    const created = new Date(startDate);
    created.setDate(startDate.getDate() - i);

    const updated = new Date(created);
    updated.setDate(created.getDate() + (i % 4));

    orders.push({
      id: `${i}`,
      orderNumber: `${58332475 - i * 137}`,
      source,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      customerPhone: `9665${String(10000000 + i * 73).slice(-8)}`,
      payment,
      paymentStatus: paymentStatusFor(status),
      shipping: SHIPPING[i % SHIPPING.length],
      total: Number((50 + ((i * 37) % 1900) + (i % 7) * 0.125).toFixed(3)),
      currency: CURRENCIES[i % CURRENCIES.length],
      status,
      createdDate: formatDate(created),
      updatedDate: formatDate(updated),
    });
  }

  return orders;
}

export const ORDERS_DATA: Order[] = generateOrders(120);
