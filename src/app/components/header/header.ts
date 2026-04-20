import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccessControlService } from '../../core/auth/access-control.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  readonly accessControl = inject(AccessControlService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);

  @Output() menuToggle = new EventEmitter<void>();

  searchQuery = signal('');
  notifCount = signal(3);
  balance = signal(50);
  balanceCurrency = signal('$');

  logout(): void {
    this.auditLogService.log({
      action: 'Auth Logout',
      entityType: 'auth',
      summary: 'User logged out of the admin dashboard.',
    });
    this.authService.logout();
    this.toastService.info('Logged out successfully.');
    void this.router.navigateByUrl('/login');
  }
}
