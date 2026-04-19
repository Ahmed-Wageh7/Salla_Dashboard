import { Routes } from '@angular/router';
import { StaffAttendanceComponent } from './attendance/attendance';
import { StaffDeductionsComponent } from './deductions/deductions';
import { StaffSalaryComponent } from './salary/salary';

export const STAFF_ROUTES: Routes = [
  { path: '', redirectTo: 'attendance', pathMatch: 'full' },
  { path: 'attendance', component: StaffAttendanceComponent },
  { path: 'deductions', component: StaffDeductionsComponent },
  { path: 'salary', component: StaffSalaryComponent },
];
