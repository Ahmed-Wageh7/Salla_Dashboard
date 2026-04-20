import { Routes } from '@angular/router';
import { OrdersComponent } from './orders';
import { OrderDetailComponent } from './order-detail/order-detail';

export const ORDERS_ROUTES: Routes = [
  { path: '', component: OrdersComponent, title: 'Orders | Salla Dashboard' },
  { path: 'manual-orders', redirectTo: '', pathMatch: 'full' },
  { path: 'abandoned-carts', redirectTo: '', pathMatch: 'full' },
  { path: ':id', component: OrderDetailComponent, title: 'Order Details | Salla Dashboard' },
];
