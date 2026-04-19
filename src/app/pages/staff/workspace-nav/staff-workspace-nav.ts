import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { STAFF_SECTIONS } from '../staff-sections';

@Component({
  selector: 'app-staff-workspace-nav',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './staff-workspace-nav.html',
  styleUrls: ['../staff.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffWorkspaceNavComponent {
  readonly sections = STAFF_SECTIONS;
}
