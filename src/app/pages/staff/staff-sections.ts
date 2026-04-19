export interface StaffSection {
  id: 'attendance' | 'deductions' | 'salary';
  title: string;
  description: string;
  route: string;
  icon: string;
  exact: boolean;
  eyebrow: string;
  ctaLabel: string;
}

export const STAFF_SECTIONS: StaffSection[] = [
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Handle daily check-in and check-out actions from one focused screen.',
    route: '/staff/attendance',
    icon: 'fa-clock',
    exact: false,
    eyebrow: 'Daily workflow',
    ctaLabel: 'Open attendance',
  },
  {
    id: 'deductions',
    title: 'Deductions',
    description: 'Load a staff member, review monthly deductions, and update entries quickly.',
    route: '/staff/deductions',
    icon: 'fa-file-invoice-dollar',
    exact: false,
    eyebrow: 'Review workflow',
    ctaLabel: 'Open deductions',
  },
  {
    id: 'salary',
    title: 'Salary',
    description: 'Inspect salary payloads, apply adjustments, and complete payroll actions.',
    route: '/staff/salary',
    icon: 'fa-wallet',
    exact: false,
    eyebrow: 'Payroll workflow',
    ctaLabel: 'Open salary',
  },
];
