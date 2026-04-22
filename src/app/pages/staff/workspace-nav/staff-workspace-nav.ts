import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { STAFF_SECTIONS } from '../staff-sections';
import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-staff-workspace-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './staff-workspace-nav.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffWorkspaceNavComponent {
  readonly i18n = inject(TranslationService);
  readonly sections = computed(() => {
    this.i18n.language();
    return STAFF_SECTIONS.map((section) => ({
      ...section,
      eyebrow: this.i18n.t(`staffPage.modules.${section.id}.eyebrow`),
      title: this.i18n.t(`staffPage.modules.${section.id}.title`),
      description: this.i18n.t(`staffPage.modules.${section.id}.description`),
      ctaLabel: this.i18n.t(`staffPage.modules.${section.id}.cta`),
    }));
  });
}
