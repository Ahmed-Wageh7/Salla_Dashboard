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
  { path: 'members/:id', component: StaffMemberDetailComponent, title: 'Staff Details | Salla Dashboard' },
  { path: 'members', component: StaffMembersComponent, title: 'Staff Members | Salla Dashboard' },
  { path: 'attendance', component: StaffAttendanceComponent, title: 'Attendance | Salla Dashboard' },
  { path: 'deductions/:id', component: StaffDeductionDetailComponent, title: 'Deduction Details | Salla Dashboard' },
  { path: 'deductions', component: StaffDeductionsComponent, title: 'Deductions | Salla Dashboard' },
  { path: 'salary/:id', component: StaffSalaryDetailComponent, title: 'Salary Details | Salla Dashboard' },
  { path: 'salary', component: StaffSalaryComponent, title: 'Salary | Salla Dashboard' },
];
