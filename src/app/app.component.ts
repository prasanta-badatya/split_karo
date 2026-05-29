import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { QuickSplitComponent } from './components/quick-split/quick-split.component';

type Tab = 'home' | 'groups' | 'trips' | '';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, QuickSplitComponent],
  template: `
    <router-outlet></router-outlet>

    <!-- ═══ GLOBAL BOTTOM NAV ═══ -->
    <nav class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 overflow-visible"
      style="padding-bottom: env(safe-area-inset-bottom)">
      <div class="flex items-end h-16 max-w-lg mx-auto px-2">

        <!-- Home -->
        <button (click)="navigate('/')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'home' ? 'text-brand-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'home' ? 'bg-brand-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'home' ? 'scale-110' : 'scale-100'">🏠</span>
          <span class="relative text-[10px] font-bold tracking-wide">Home</span>
        </button>

        <!-- Groups -->
        <button (click)="navigate('/groups')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'groups' ? 'text-brand-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'groups' ? 'bg-brand-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'groups' ? 'scale-110' : 'scale-100'">📋</span>
          <span class="relative text-[10px] font-bold tracking-wide">Groups</span>
        </button>

        <!-- Quick Split — raised FAB (always highlighted) -->
        <button (click)="showQuickSplit.set(true)"
          class="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5 -mt-5">
          <div class="w-14 h-14 bg-amber-400 hover:bg-amber-500 active:scale-95 rounded-full shadow-xl
                      flex items-center justify-center ring-4 ring-white transition-all duration-150">
            <span class="text-2xl leading-none">⚡</span>
          </div>
          <span class="text-[10px] font-bold tracking-wide text-amber-700">Quick</span>
        </button>

        <!-- Trips -->
        <button (click)="navigate('/trips')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'trips' ? 'text-indigo-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'trips' ? 'bg-indigo-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'trips' ? 'scale-110' : 'scale-100'">✈️</span>
          <span class="relative text-[10px] font-bold tracking-wide">Trips</span>
        </button>

        <!-- More -->
        <button class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-300 cursor-not-allowed">
          <span class="text-[22px] leading-none">⋯</span>
          <span class="text-[10px] font-bold tracking-wide">More</span>
        </button>

      </div>
    </nav>

    <!-- Quick Split overlay (global) -->
    <app-quick-split *ngIf="showQuickSplit()" (close)="showQuickSplit.set(false)"></app-quick-split>

    <!-- PWA update banner -->
    <div *ngIf="updateReady()"
      class="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto
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
  private router       = inject(Router);
  readonly updateReady  = signal(false);
  readonly showQuickSplit = signal(false);
  activeTab: Tab = 'home';

  ngOnInit(): void {
    this.setTab(this.router.url);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => this.setTab((e as NavigationEnd).urlAfterRedirects));

    if (!this.swUpdate?.isEnabled) return;
    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.updateReady.set(true));
    this.swUpdate.checkForUpdate();
  }

  private setTab(url: string): void {
    if (url === '/' || url === '') this.activeTab = 'home';
    else if (url.startsWith('/group') || url.startsWith('/new')) this.activeTab = 'groups';
    else if (url.startsWith('/trip')) this.activeTab = 'trips';
    else this.activeTab = '';
  }

  navigate(path: string): void { this.router.navigate([path]); }

  applyUpdate(): void { document.location.reload(); }
}
