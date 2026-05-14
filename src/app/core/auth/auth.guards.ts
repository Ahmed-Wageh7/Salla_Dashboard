import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessControlService } from './access-control.service';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  if (typeof window === 'undefined') return true;

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const guestOnlyGuard: CanActivateFn = () => {
  if (typeof window === 'undefined') return true;

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

export const permissionGuard: CanActivateFn = (route) => {
  if (typeof window === 'undefined') return true;

  const accessControl = inject(AccessControlService);
  const router = inject(Router);
  const permissions = route.data?.['permissions'] as string[] | undefined;

  return accessControl.canAll(permissions) ? true : router.createUrlTree(['/forbidden']);
};
