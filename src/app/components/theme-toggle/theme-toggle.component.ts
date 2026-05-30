import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="theme.toggle()" type="button"
      title="Toggle dark mode" aria-label="Toggle dark mode"
      class="relative w-[3.25rem] h-7 rounded-full flex-shrink-0 ring-1 ring-inset
             transition-colors duration-500 overflow-hidden"
      [ngClass]="isDark()
        ? 'bg-gradient-to-br from-indigo-600 to-violet-700 ring-white/15'
        : 'bg-gradient-to-br from-amber-200 to-amber-300 ring-black/5'">

      <!-- faint track icons -->
      <span class="absolute inset-0 flex items-center justify-between px-1.5 text-[10px] leading-none pointer-events-none">
        <span class="transition-opacity duration-300" [class.opacity-30]="isDark()">☀️</span>
        <span class="transition-opacity duration-300" [class.opacity-30]="!isDark()">🌙</span>
      </span>

      <!-- sliding knob -->
      <span class="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md
                   flex items-center justify-center text-[11px] leading-none
                   transition-transform duration-500"
        style="transition-timing-function: cubic-bezier(.34,1.56,.64,1)"
        [ngClass]="isDark() ? 'translate-x-[1.5rem]' : 'translate-x-0'">
        <span class="transition-transform duration-500"
          [ngClass]="isDark() ? 'rotate-[360deg]' : 'rotate-0'">{{ isDark() ? '🌙' : '☀️' }}</span>
      </span>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
  isDark(): boolean { return this.theme.theme() === 'dark'; }
}
