import { Routes } from '@angular/router';

import { authGuard, guestOnlyGuard, permissionGuard } from './core/auth/auth.guards';
import { Layout } from './layout/layout';
import { AuditLogsComponent } from './pages/audit-logs/audit-logs';
import { MainContentComponent } from './pages/dashboard/dashboard';
import { ForbiddenPageComponent } from './pages/forbidden/forbidden';
import { LoginPageComponent } from './pages/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    title: 'Login | Salla Dashboard',
    canActivate: [guestOnlyGuard],
  },
  {
    path: 'forbidden',
    component: ForbiddenPageComponent,
    title: 'Forbidden | Salla Dashboard',
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: MainContentComponent,
        pathMatch: 'full',
        title: 'Dashboard | Salla Dashboard',
        canActivate: [permissionGuard],
        data: { permissions: ['dashboard.view'] },
      },
      {
        path: 'dashboard',
        component: MainContentComponent,
        title: 'Dashboard | Salla Dashboard',
        canActivate: [permissionGuard],
        data: { permissions: ['dashboard.view'] },
      },
      {
        path: 'products',
        canActivate: [permissionGuard],
        data: { permissions: ['products.read'] },
        loadChildren: () => import('./pages/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'orders',
        canActivate: [permissionGuard],
        data: { permissions: ['orders.read'] },
        loadChildren: () => import('./pages/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      {
        path: 'staff',
        canActivate: [permissionGuard],
        data: { permissions: ['staff.read'] },
        loadChildren: () => import('./pages/staff/staff.routes').then((m) => m.STAFF_ROUTES),
      },
      {
        path: 'audit-logs',
        component: AuditLogsComponent,
        title: 'Audit Log | Salla Dashboard',
        canActivate: [permissionGuard],
        data: { permissions: ['audit.read'] },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
