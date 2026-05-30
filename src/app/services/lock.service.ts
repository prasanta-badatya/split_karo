import { Injectable, signal } from '@angular/core';

const KEY = 'sk_pin';

interface StoredPin { salt: string; hash: string; }

/**
 * Local PIN lock — fully offline. The PIN is never stored in plain text;
 * only a PBKDF2-SHA256 hash + random salt is kept in localStorage.
 * This is a screen gate (stops casual snooping), not encryption-at-rest.
 */
@Injectable({ providedIn: 'root' })
export class LockService {
  readonly isLocked = signal(false);

  hasPin(): boolean {
    return !!localStorage.getItem(KEY);
  }

  /** Lock on startup if a PIN is configured. */
  init(): void {
    if (this.hasPin()) this.isLocked.set(true);
  }

  async setPin(pin: string): Promise<void> {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const salt = this.toHex(saltBytes);
    const hash = await this.derive(pin, salt);
    localStorage.setItem(KEY, JSON.stringify({ salt, hash } as StoredPin));
  }

  async verify(pin: string): Promise<boolean> {
    const raw = localStorage.getItem(KEY);
    if (!raw) return true;
    const { salt, hash } = JSON.parse(raw) as StoredPin;
    return (await this.derive(pin, salt)) === hash;
  }

  async unlock(pin: string): Promise<boolean> {
    const ok = await this.verify(pin);
    if (ok) this.isLocked.set(false);
    return ok;
  }

  removePin(): void {
    localStorage.removeItem(KEY);
    this.isLocked.set(false);
  }

  private async derive(pin: string, saltHex: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: this.fromHex(saltHex), iterations: 100_000, hash: 'SHA-256' },
      key,
      256,
    );
    return this.toHex(new Uint8Array(bits));
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private fromHex(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
}
