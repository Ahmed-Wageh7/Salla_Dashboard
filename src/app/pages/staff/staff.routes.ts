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
  { path: 'members/:id', component: StaffMemberDetailComponent },
  { path: 'members', component: StaffMembersComponent },
  { path: 'attendance', component: StaffAttendanceComponent },
  { path: 'deductions/:id', component: StaffDeductionDetailComponent },
  { path: 'deductions', component: StaffDeductionsComponent },
  { path: 'salary/:id', component: StaffSalaryDetailComponent },
  { path: 'salary', component: StaffSalaryComponent },
];
