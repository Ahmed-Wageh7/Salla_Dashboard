import { Injectable, computed, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  variant: 'app' | 'notification';
  durationMs: number;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastOptions {
  title?: string;
  durationMs?: number;
  variant?: 'app' | 'notification';
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
  readonly activeDurationMs = signal(0);
  readonly activePaused = signal(false);
  private nextId = 1;
  private readonly queue: ToastItem[] = [];
  private dismissTimerId?: ReturnType<typeof setTimeout>;
  private activeRemainingMs = 0;
  private activeStartedAt = 0;

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
    this.activeDurationMs.set(0);
    this.activePaused.set(false);
    this.activeRemainingMs = 0;
    this.activeStartedAt = 0;
    this.showNextToast();
  }

  pause(id: number): void {
    if (this.currentToast()?.id !== id || this.activePaused()) {
      return;
    }

    const elapsed = Date.now() - this.activeStartedAt;
    this.activeRemainingMs = Math.max(0, this.activeRemainingMs - elapsed);
    this.clearDismissTimer();
    this.activePaused.set(true);
  }

  resume(id: number): void {
    if (this.currentToast()?.id !== id || !this.activePaused()) {
      return;
    }

    this.activePaused.set(false);
    this.startDismissTimer(this.activeRemainingMs);
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
      variant: options.variant ?? 'app',
      durationMs: options.durationMs ?? 2000,
      title: options.title,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
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

    this.currentToast.set(nextToast);
    this.activeDurationMs.set(nextToast.durationMs);
    this.activePaused.set(false);
    this.startDismissTimer(nextToast.durationMs);
  }

  private clearDismissTimer(): void {
    if (this.dismissTimerId) {
      clearTimeout(this.dismissTimerId);
      this.dismissTimerId = undefined;
    }
  }

  private startDismissTimer(durationMs: number): void {
    const activeToast = this.currentToast();
    if (!activeToast) {
      return;
    }

    this.clearDismissTimer();
    this.activeRemainingMs = durationMs;
    this.activeStartedAt = Date.now();
    this.dismissTimerId = setTimeout(() => this.dismiss(activeToast.id), durationMs);
  }
}
