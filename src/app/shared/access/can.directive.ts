import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { AccessControlService, Permission } from '../../core/auth/access-control.service';

@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class CanDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly accessControl = inject(AccessControlService);

  readonly required = input<Permission | Permission[] | string | string[] | null>(null, {
    alias: 'appCan',
  });
  readonly mode = input<'any' | 'all'>('all', { alias: 'appCanMode' });

  private readonly allowed = computed(() => {
    const value = this.required();
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return this.mode() === 'any'
      ? this.accessControl.canAny(list)
      : this.accessControl.canAll(list);
  });

  constructor() {
    effect(() => {
      this.viewContainerRef.clear();
      if (this.allowed()) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      }
    });
  }
}
