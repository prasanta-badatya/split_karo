import { Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const KEY = 'sk_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.read());

  private read(): Theme {
    return (localStorage.getItem(KEY) as Theme) || 'light';
  }

  /** Apply the stored theme to <html>. Called once at startup. */
  apply(): void {
    this.setClass(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    // Briefly enable global colour transitions so the whole app eases between modes
    const root = document.documentElement;
    root.classList.add('theme-transition');
    this.theme.set(theme);
    localStorage.setItem(KEY, theme);
    this.setClass(theme);
    window.setTimeout(() => root.classList.remove('theme-transition'), 500);
  }

  private setClass(theme: Theme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
