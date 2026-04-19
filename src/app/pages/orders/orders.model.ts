export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | (string & {});

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Refunded';

export type PaymentMethod =
  | 'Apple Pay'
  | 'Bank Transfer'
  | 'Cash on Delivery'
  | 'Credit Card'
  | 'STC Pay'
  | (string & {});

export type OrderSource = 'Store' | 'Manual' | 'App' | (string & {});

export interface Order {
  id: string;
  orderNumber: string;
  source: OrderSource;
  customer: string;
  customerPhone: string;
  customerEmail?: string;
  payment: PaymentMethod;
  paymentStatus: PaymentStatus;
  shipping: string;
  total: number;
  currency: string;
  status: OrderStatus;
  createdDate: string;
  updatedDate: string;
  tags?: string[];
  expanded?: boolean;
  selected?: boolean;
}

export interface OrderTab {
  label: string;
  key: string;
  count: number;
}
