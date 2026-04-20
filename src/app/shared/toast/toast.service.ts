import { Injectable, computed, signal } from '@angular/core';

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
  private readonly currentToast = signal<ToastItem | null>(null);
  readonly toasts = computed(() => {
    const activeToast = this.currentToast();
    return activeToast ? [activeToast] : [];
  });
  private nextId = 1;
  private readonly queue: Array<ToastItem & { durationMs: number }> = [];
  private dismissTimerId?: ReturnType<typeof setTimeout>;

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
    if (this.currentToast()?.id !== id) {
      const queuedIndex = this.queue.findIndex((item) => item.id === id);
      if (queuedIndex >= 0) {
        this.queue.splice(queuedIndex, 1);
      }
      return;
    }

    this.clearDismissTimer();
    this.currentToast.set(null);
    this.showNextToast();
  }

  triggerAction(id: number): void {
    const toast = this.currentToast()?.id === id ? this.currentToast() : this.queue.find((item) => item.id === id);
    toast?.onAction?.();
    this.dismiss(id);
  }

  private push(message: string, tone: ToastItem['tone'], options: ToastOptions): void {
    const id = this.nextId++;
    this.queue.push({
      id,
      message,
      tone,
      title: options.title,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      durationMs: options.durationMs ?? 3200,
    });
    this.showNextToast();
  }

  private showNextToast(): void {
    if (this.currentToast() || this.queue.length === 0) {
      return;
    }

    const nextToast = this.queue.shift();
    if (!nextToast) {
      return;
    }

    const { durationMs, ...toast } = nextToast;
    this.currentToast.set(toast);
    this.dismissTimerId = setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  private clearDismissTimer(): void {
    if (this.dismissTimerId) {
      clearTimeout(this.dismissTimerId);
      this.dismissTimerId = undefined;
    }
  }
}
