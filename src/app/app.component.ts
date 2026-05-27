import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet></router-outlet>

    <!-- Update banner -->
    <div *ngIf="updateReady()"
      class="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto
             bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3
             flex items-center gap-3" style="animation: slideUp 0.3s ease-out">
      <span class="text-xl flex-shrink-0">🆕</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold">New version available</p>
        <p class="text-xs text-gray-400 mt-0.5">Tap Update to get the latest features</p>
      </div>
      <button (click)="applyUpdate()"
        class="flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
        Update
      </button>
    </div>
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateY(80px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `]
})
export class AppComponent implements OnInit {
  private swUpdate     = inject(SwUpdate, { optional: true });
  readonly updateReady = signal(false);

  ngOnInit(): void {
    if (!this.swUpdate?.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));

    this.swUpdate.checkForUpdate();
  }

  applyUpdate(): void {
    document.location.reload();
  }
}
