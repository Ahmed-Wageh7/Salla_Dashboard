import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { STAFF_SECTIONS } from './staff-sections';

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
  readonly modules: StaffModuleCard[] = STAFF_SECTIONS.map((section) => ({
    eyebrow: section.eyebrow,
    title: section.title,
    description: section.description,
    route: section.route,
    icon: section.icon,
    ctaLabel: section.ctaLabel,
  }));
}
