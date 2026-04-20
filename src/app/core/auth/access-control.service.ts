import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

export type UserRole = 'owner' | 'manager' | 'staff';

export type Permission =
  | 'dashboard.view'
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.write'
  | 'staff.read'
  | 'staff.write'
  | 'attendance.write'
  | 'salary.write'
  | 'deductions.write'
  | 'audit.read';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'dashboard.view',
    'products.read',
    'products.write',
    'orders.read',
    'orders.write',
    'staff.read',
    'staff.write',
    'attendance.write',
    'salary.write',
    'deductions.write',
    'audit.read',
  ],
  manager: [
    'dashboard.view',
    'products.read',
    'products.write',
    'orders.read',
    'orders.write',
    'staff.read',
    'attendance.write',
    'deductions.write',
    'audit.read',
  ],
  staff: ['dashboard.view', 'products.read', 'orders.read', 'staff.read', 'attendance.write'],
};

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly authService = inject(AuthService);

  readonly role = computed<UserRole>(() => this.authService.currentRole());
  readonly permissions = computed<Permission[]>(() => {
    const explicitPermissions = this.authService.currentPermissions();
    if (explicitPermissions.length) return explicitPermissions;
    return ROLE_PERMISSIONS[this.role()];
  });

  can(permission: Permission | string | null | undefined): boolean {
    if (!permission) return true;
    return this.permissions().includes(permission as Permission);
  }

  canAny(permissions: readonly (Permission | string)[] | null | undefined): boolean {
    if (!permissions?.length) return true;
    return permissions.some((permission) => this.can(permission));
  }

  canAll(permissions: readonly (Permission | string)[] | null | undefined): boolean {
    if (!permissions?.length) return true;
    return permissions.every((permission) => this.can(permission));
  }

  roleLabel(): string {
    const role = this.role();
    return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
