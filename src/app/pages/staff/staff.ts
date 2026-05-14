import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { STAFF_SECTIONS } from './staff-sections';
import { TranslationService } from '../../core/i18n/translation.service';

interface StaffModuleCard {
  eyebrow: string;
  title: string;
  description: string;
  route: string;
  icon: string;
  ctaLabel: string;
}

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff.html',
  styleUrls: ['./staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffComponent {
  readonly i18n = inject(TranslationService);
  readonly modules = computed<StaffModuleCard[]>(() => {
    this.i18n.language();
    return STAFF_SECTIONS.map((section) => ({
      eyebrow: this.i18n.t(`staffPage.modules.${section.id}.eyebrow`),
      title: this.i18n.t(`staffPage.modules.${section.id}.title`),
      description: this.i18n.t(`staffPage.modules.${section.id}.description`),
      route: section.route,
      icon: section.icon,
      ctaLabel: this.i18n.t(`staffPage.modules.${section.id}.cta`),
    }));
  });
}
