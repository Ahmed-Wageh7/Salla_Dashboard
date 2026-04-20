import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastOptions {
  title?: string;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);
  private nextId = 1;

  success(message: string, options: ToastOptions = {}): void {
    this.push(message, 'success', options);
  }

  error(message: string, options: ToastOptions = {}): void {
    this.push(message, 'error', options);
  }

  info(message: string, options: ToastOptions = {}): void {
    this.push(message, 'info', options);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  triggerAction(id: number): void {
    const toast = this.toasts().find((item) => item.id === id);
    toast?.onAction?.();
    this.dismiss(id);
  }

  private push(message: string, tone: ToastItem['tone'], options: ToastOptions): void {
    const id = this.nextId++;
    const durationMs = options.durationMs ?? 3200;
    this.toasts.update((items) => [
      ...items,
      {
        id,
        message,
        tone,
        title: options.title,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
      },
    ]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
