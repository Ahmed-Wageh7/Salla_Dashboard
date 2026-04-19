import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { SidebarComponent } from './sidebar';

@Component({
  standalone: true,
  template: '',
})
class DummyRouteComponent {}

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'staff', component: DummyRouteComponent },
          { path: 'staff/attendance', component: DummyRouteComponent },
        ]),
        SidebarComponent,
      ],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the active staff section expanded after route navigation', async () => {
    await router.navigateByUrl('/staff/attendance');
    fixture.detectChanges();

    const staffItem = component.expandableNav.find((item) => item.id === 'staff');

    expect(staffItem).toBeDefined();
    expect(component.isExpanded(staffItem!)).toBe(true);
    expect(component.isRouteActive('/staff/attendance')).toBe(true);
  });

  it('shows only the actionable staff destinations in the submenu', () => {
    const staffItem = component.expandableNav.find((item) => item.id === 'staff');

    expect(staffItem?.children?.map((item) => item.id)).toEqual([
      'attendance',
      'deductions',
      'salary',
    ]);
  });

  it('marks the attendance child as active on the attendance page', async () => {
    await router.navigateByUrl('/staff/attendance');
    fixture.detectChanges();

    const attendanceItem = component.expandableNav
      .find((item) => item.id === 'staff')
      ?.children?.find((item) => item.id === 'attendance');

    expect(attendanceItem).toBeDefined();
    expect(component.isItemRouteActive(attendanceItem!)).toBe(true);
  });
});
