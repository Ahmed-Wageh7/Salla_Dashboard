import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SidebarComponent } from '../components/sidebar/sidebar';
import { HeaderComponent } from '../components/header/header';
import { RouterOutlet } from '@angular/router';
import { AccessControlService } from '../core/auth/access-control.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent, RouterOutlet],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
  private readonly accessControl = inject(AccessControlService);
  readonly sidebarOpen = signal(false);
  readonly isReadOnlyWorkspace = computed(
    () =>
      !this.accessControl.canAny([
        'products.write',
        'orders.write',
        'staff.write',
        'attendance.write',
        'salary.write',
        'deductions.write',
      ]),
  );

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  toggleSidebar() {
    this.sidebarOpen.update((open) => !open);
  }
}
