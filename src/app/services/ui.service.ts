import { Injectable, signal } from '@angular/core';

export interface ToastState { icon: string; msg: string; }

export interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * App-wide, non-blocking UI feedback: toasts and styled confirm dialogs.
 * Replaces native alert()/confirm() with on-brand components rendered by AppComponent.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly toastState   = signal<ToastState | null>(null);
  readonly confirmState = signal<ConfirmState | null>(null);

  private toastTimer?: ReturnType<typeof setTimeout>;

  toast(msg: string, icon = '✅'): void {
    clearTimeout(this.toastTimer);
    this.toastState.set({ icon, msg });
    this.toastTimer = setTimeout(() => this.toastState.set(null), 2600);
  }

  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmState.set({
        title: opts.title,
        message: opts.message ?? '',
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }

  resolveConfirm(ok: boolean): void {
    const state = this.confirmState();
    if (state) state.resolve(ok);
    this.confirmState.set(null);
  }
}
