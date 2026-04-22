import { Routes } from '@angular/router';
import { StaffAttendanceComponent } from './attendance/attendance';
import { StaffDeductionDetailComponent } from './deduction-detail/deduction-detail';
import { StaffDeductionsComponent } from './deductions/deductions';
import { StaffMemberDetailComponent } from './member-detail/member-detail';
import { StaffMembersComponent } from './members/members';
import { StaffSalaryDetailComponent } from './salary-detail/salary-detail';
import { StaffSalaryComponent } from './salary/salary';

export const STAFF_ROUTES: Routes = [
  { path: '', redirectTo: 'members', pathMatch: 'full' },
  { path: 'members/:id', component: StaffMemberDetailComponent, data: { titleKey: 'routes.staffDetails' } },
  { path: 'members', component: StaffMembersComponent, data: { titleKey: 'routes.staffMembers' } },
  { path: 'attendance', component: StaffAttendanceComponent, data: { titleKey: 'routes.attendance' } },
  {
    path: 'deductions/:id',
    component: StaffDeductionDetailComponent,
    data: { titleKey: 'routes.deductionDetails' },
  },
  { path: 'deductions', component: StaffDeductionsComponent, data: { titleKey: 'routes.deductions' } },
  { path: 'salary/:id', component: StaffSalaryDetailComponent, data: { titleKey: 'routes.salaryDetails' } },
  { path: 'salary', component: StaffSalaryComponent, data: { titleKey: 'routes.salary' } },
];
