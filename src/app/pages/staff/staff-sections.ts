export interface StaffSection {
  id: 'members' | 'attendance' | 'deductions' | 'salary';
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
    id: 'members',
    title: 'Staff members',
    description: 'Create, inspect, edit, and delete staff records linked to backend users.',
    route: '/staff/members',
    icon: 'fa-users',
    exact: false,
    eyebrow: 'Admin records',
    ctaLabel: 'Open members',
  },
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
