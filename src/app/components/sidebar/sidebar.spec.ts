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
          { path: 'staff/members', component: DummyRouteComponent },
          { path: 'staff/attendance', component: DummyRouteComponent },
          { path: 'products', component: DummyRouteComponent },
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
      'members',
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

  it('marks the staff members child as active on the members page', async () => {
    await router.navigateByUrl('/staff/members');
    fixture.detectChanges();

    const membersItem = component.expandableNav
      .find((item) => item.id === 'staff')
      ?.children?.find((item) => item.id === 'members');

    expect(membersItem).toBeDefined();
    expect(component.isItemRouteActive(membersItem!)).toBe(true);
  });

  it('keeps parent product navigation active when query params are present', async () => {
    await router.navigateByUrl('/products?tab=archived');
    fixture.detectChanges();

    const productsItem = component.expandableNav.find((item) => item.id === 'products');

    expect(productsItem).toBeDefined();
    expect(component.isItemRouteActive(productsItem!)).toBe(true);
  });
});
