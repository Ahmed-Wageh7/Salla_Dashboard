import {
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { AccessControlService, Permission } from '../../core/auth/access-control.service';

@Directive({
  selector: '[appCanDisable]',
  standalone: true,
})
export class CanDisableDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly accessControl = inject(AccessControlService);

  readonly required = input<Permission | Permission[] | string | string[] | null>(null, {
    alias: 'appCanDisable',
  });
  readonly reason = input('You do not have permission to perform this action.', {
    alias: 'appCanDisableReason',
  });
  readonly mode = input<'any' | 'all'>('all', { alias: 'appCanDisableMode' });

  private readonly blocked = computed(() => {
    const value = this.required();
    const list = Array.isArray(value) ? value : value ? [value] : [];
    if (!list.length) return false;

    return this.mode() === 'any'
      ? !this.accessControl.canAny(list)
      : !this.accessControl.canAll(list);
  });

  constructor() {
    effect(() => this.syncState());
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    if (!this.blocked()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private syncState(): void {
    const host = this.elementRef.nativeElement;
    const blocked = this.blocked();
    const isNativeControl =
      host instanceof HTMLButtonElement ||
      host instanceof HTMLInputElement ||
      host instanceof HTMLSelectElement ||
      host instanceof HTMLTextAreaElement;

    this.renderer[blocked ? 'addClass' : 'removeClass'](host, 'app-action--restricted');
    this.renderer.setAttribute(host, 'aria-disabled', String(blocked));

    if (blocked) {
      this.renderer.setAttribute(host, 'title', this.reason());
      this.renderer.setStyle(host, 'cursor', 'not-allowed');
      this.renderer.setStyle(host, 'opacity', '0.66');
      if (isNativeControl) {
        this.renderer.setProperty(host, 'disabled', true);
      } else {
        this.renderer.setStyle(host, 'pointer-events', 'none');
      }
      return;
    }

    this.renderer.removeAttribute(host, 'title');
    this.renderer.removeStyle(host, 'cursor');
    this.renderer.removeStyle(host, 'opacity');
    this.renderer.removeStyle(host, 'pointer-events');
    if (isNativeControl) {
      this.renderer.removeAttribute(host, 'disabled');
    }
  }
}
