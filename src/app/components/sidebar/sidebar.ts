import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  OnInit,
  HostListener,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AccessControlService, Permission } from '../../core/auth/access-control.service';

export interface NavItem {
  id: string;
  label: string;
  route?: string;
  icon?: string;
  badge?: number;
  exact?: boolean;
  isExpandable?: boolean;
  permissions?: Permission[];
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'], // Fixed typo here
  animations: [
    trigger('submenu', [
      state('closed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('open', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('closed <=> open', animate('220ms cubic-bezier(0.4,0,0.2,1)')),
    ]),
    trigger('fadeBackdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('180ms ease', style({ opacity: 0 }))]),
    ]),
  ],
})
export class SidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accessControl = inject(AccessControlService);

  @Input() isOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  isMobile = signal(false);
  expanded = signal<string | null>(null);

  readonly mainNav: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'dashboard',
      exact: true,
      permissions: ['dashboard.view'],
    },
  ];

  readonly expandableNav: NavItem[] = [
    {
      id: 'products',
      label: 'Products',
      icon: 'products',
      route: '/products',
      isExpandable: true,
      permissions: ['products.read'],
      children: [
        {
          id: 'all-products',
          label: 'All Products',
          route: '/products',
          exact: true,
          permissions: ['products.read'],
        },
        {
          id: 'categories',
          label: 'Categories',
          route: '/products/categories',
          permissions: ['products.read'],
        },
        {
          id: 'subcategories',
          label: 'Subcategories',
          route: '/products/subcategories',
          permissions: ['products.read'],
        },
      ],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'orders',
      route: '/orders',
      isExpandable: true,
      permissions: ['orders.read'],
      children: [
        {
          id: 'orders-overview',
          label: 'All Orders',
          route: '/orders',
          exact: true,
          permissions: ['orders.read'],
        },
      ],
    },
    {
      id: 'staff',
      label: 'Staff',
      icon: 'customers',
      route: '/staff',
      isExpandable: true,
      permissions: ['staff.read'],
      children: [
        {
          id: 'attendance',
          label: 'Attendance',
          route: '/staff/attendance',
          permissions: ['staff.read'],
        },
        {
          id: 'deductions',
          label: 'Deductions',
          route: '/staff/deductions',
          permissions: ['staff.read'],
        },
        {
          id: 'salary',
          label: 'Salary',
          route: '/staff/salary',
          permissions: ['staff.read'],
        },
      ],
    },
  ];

  readonly extraNav: NavItem[] = [];

  readonly bottomNav: NavItem[] = [
    {
      id: 'audit-logs',
      label: 'Audit Log',
      route: '/audit-logs',
      icon: 'analytics',
      permissions: ['audit.read'],
    },
  ];

  readonly visibleMainNav = computed(() => this.filterNav(this.mainNav));
  readonly visibleExpandableNav = computed(() => this.filterNav(this.expandableNav));
  readonly visibleExtraNav = computed(() => this.filterNav(this.extraNav));
  readonly visibleBottomNav = computed(() => this.filterNav(this.bottomNav));

  ngOnInit() {
    this._checkViewport();
  }

  @HostListener('window:resize')
  _checkViewport() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 1024);
    }
  }

  toggleExpand(id: string) {
    if (this.expanded() === id) this.expanded.set(null);
    else this.expanded.set(id);
  }

  isExpanded(item: NavItem): boolean {
    return this.expanded() === item.id || this.isNavItemActive(item);
  }

  isRouteActive(route?: string): boolean {
    return this.routeMatches(this.router.url, route);
  }

  isItemRouteActive(item: NavItem): boolean {
    return this.routeMatches(this.router.url, item.route, item.exact);
  }

  private isNavItemActive(item: NavItem): boolean {
    return (
      this.routeMatches(this.router.url, item.route, item.exact) ||
      (item.children?.some((child) => this.isNavItemActive(child)) ?? false)
    );
  }

  private routeMatches(url: string, route?: string, exact = false): boolean {
    if (!route) return false;
    if (exact) return url === route;
    return url === route || url.startsWith(`${route}/`);
  }

  onNavigate(): void {
    if (this.isMobile()) {
      this.closeMenu.emit();
    }
  }

  navigate(route?: string): void {
    if (!route) return;

    void this.router.navigateByUrl(route).then(() => {
      this.onNavigate();
    });
  }

  getIcon(name?: string): string {
    const icons: Record<string, string> = {
      dashboard: '<i class="fas fa-th-large"></i>',
      orders: '<i class="fas fa-shopping-cart"></i>',
      products: '<i class="fas fa-box"></i>',
      customers: '<i class="fas fa-users"></i>',
      marketing: '<i class="fas fa-bullhorn"></i>',
      analytics: '<i class="fas fa-chart-line"></i>',
      finance: '<i class="fas fa-wallet"></i>',
      financing: '<i class="fas fa-money-bill-wave"></i>',
      services: '<i class="fas fa-concierge-bell"></i>',
      channels: '<i class="fas fa-share-alt"></i>',
      apps: '<i class="fas fa-th-large"></i>',
      settings: '<i class="fas fa-cog"></i>',
    };
    return name ? (icons[name] ?? '') : '';
  }

  private filterNav(items: readonly NavItem[]): NavItem[] {
    return items
      .map((item) => ({
        ...item,
        children: item.children ? this.filterNav(item.children) : undefined,
      }))
      .filter((item) => {
        const hasPermission = this.accessControl.canAny(item.permissions);
        const hasVisibleChildren = item.children ? item.children.length > 0 : true;
        return hasPermission && hasVisibleChildren;
      });
  }
}
