import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId = 1;

  success(message: string): void {
    this.push(message, 'success');
  }

  error(message: string): void {
    this.push(message, 'error');
  }

  info(message: string): void {
    this.push(message, 'info');
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private push(message: string, tone: ToastItem['tone']): void {
    const id = this.nextId++;
    this.toasts.update((items) => [...items, { id, message, tone }]);
    setTimeout(() => this.dismiss(id), 3200);
  }
}
