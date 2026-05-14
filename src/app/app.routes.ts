import { Routes } from '@angular/router';

import { authGuard, guestOnlyGuard, permissionGuard } from './core/auth/auth.guards';
import { Layout } from './layout/layout';
import { AuditLogsComponent } from './pages/audit-logs/audit-logs';
import { MainContentComponent } from './pages/dashboard/dashboard';
import { ForbiddenPageComponent } from './pages/forbidden/forbidden';
import { LoginPageComponent } from './pages/login/login';
import { NotificationsPageComponent } from './pages/notifications/notifications';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    data: { titleKey: 'routes.login' },
    canActivate: [guestOnlyGuard],
  },
  {
    path: 'forbidden',
    component: ForbiddenPageComponent,
    data: { titleKey: 'routes.forbidden' },
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
        canActivate: [permissionGuard],
        data: { permissions: ['dashboard.view'], titleKey: 'routes.dashboard' },
      },
      {
        path: 'dashboard',
        component: MainContentComponent,
        canActivate: [permissionGuard],
        data: { permissions: ['dashboard.view'], titleKey: 'routes.dashboard' },
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
        data: { permissions: ['audit.read'], titleKey: 'routes.auditLog' },
        canActivate: [permissionGuard],
      },
      {
        path: 'notifications',
        component: NotificationsPageComponent,
        data: { titleKey: 'routes.notifications' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
