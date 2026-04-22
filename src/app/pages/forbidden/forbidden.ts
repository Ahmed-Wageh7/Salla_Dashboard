import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslationService } from '../../core/i18n/translation.service';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPageComponent {
  readonly i18n = inject(TranslationService);
}
