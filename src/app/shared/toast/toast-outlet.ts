import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-outlet.html',
  styleUrl: './toast-outlet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutletComponent {
  readonly toastService = inject(ToastService);
  readonly i18n = inject(TranslationService);

  pauseToast(id: number, variant: 'app' | 'notification'): void {
    if (variant === 'notification') return;
    this.toastService.pause(id);
  }

  resumeToast(id: number, variant: 'app' | 'notification'): void {
    if (variant === 'notification') return;
    this.toastService.resume(id);
  }
}
