import { Routes } from '@angular/router';

import { authGuard, guestOnlyGuard } from './core/auth/auth.guards';
import { Layout } from './layout/layout';
import { MainContentComponent } from './pages/dashboard/dashboard';
import { LoginPageComponent } from './pages/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [guestOnlyGuard],
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', component: MainContentComponent, pathMatch: 'full' },
      { path: 'dashboard', component: MainContentComponent },
      {
        path: 'products',
        loadChildren: () => import('./pages/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'orders',
        loadChildren: () => import('./pages/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      {
        path: 'staff',
        loadChildren: () => import('./pages/staff/staff.routes').then((m) => m.STAFF_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
