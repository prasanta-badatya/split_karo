import { Component, inject, signal, effect, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { QuickSplitComponent } from './components/quick-split/quick-split.component';
import { UiService } from './services/ui.service';
import { GroupService } from './services/group.service';
import { TripService } from './services/trip.service';
import { LockService } from './services/lock.service';
import { ThemeService } from './services/theme.service';

type Tab = 'home' | 'groups' | 'trips' | 'settings' | '';

// Routes that show the bottom tab bar. Deep/task pages (wizards, details) hide it.
const TAB_ROOTS = ['/', '', '/groups', '/trips', '/settings'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, QuickSplitComponent],
  template: `
    <!-- ═══ LOCK SCREEN ═══ -->
    <div *ngIf="lock.isLocked()"
      class="fixed inset-0 z-[70] bg-gradient-to-br from-brand-600 to-indigo-700 flex flex-col items-center justify-center px-8 select-none">
      <div class="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-5">
        <span class="text-3xl">🔒</span>
      </div>
      <h1 class="text-white font-bold text-lg">Split Karo is locked</h1>
      <p class="text-brand-200 text-sm mt-1 mb-7">Enter your PIN to continue</p>

      <!-- PIN dots -->
      <div class="flex gap-3 mb-9" [class.shake]="pinError()">
        <div *ngFor="let i of [0,1,2,3]"
          class="w-4 h-4 rounded-full border-2 transition-colors"
          [ngClass]="pinError() ? 'border-rose-300 bg-rose-300'
            : pinEntry().length > i ? 'border-white bg-white' : 'border-white/40'"></div>
      </div>

      <!-- Keypad -->
      <div class="grid grid-cols-3 gap-4 w-full max-w-[16rem]">
        <button *ngFor="let n of ['1','2','3','4','5','6','7','8','9']" (click)="pressDigit(n)"
          class="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-semibold transition-colors">
          {{ n }}
        </button>
        <span></span>
        <button (click)="pressDigit('0')"
          class="h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-2xl font-semibold transition-colors">0</button>
        <button (click)="pressBack()"
          class="h-16 rounded-2xl text-white/70 hover:text-white text-2xl transition-colors flex items-center justify-center">⌫</button>
      </div>
    </div>

    <router-outlet></router-outlet>

    <!-- ═══ GLOBAL BOTTOM NAV (tab roots only) ═══ -->
    <nav *ngIf="showNav"
      class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 overflow-visible"
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
          <span class="relative text-[11px] font-bold tracking-wide">Home</span>
        </button>

        <!-- Groups -->
        <button (click)="navigate('/groups')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'groups' ? 'text-brand-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'groups' ? 'bg-brand-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'groups' ? 'scale-110' : 'scale-100'">📋</span>
          <span class="relative text-[11px] font-bold tracking-wide">Groups</span>
        </button>

        <!-- Quick Split — raised FAB (always highlighted) -->
        <button (click)="showQuickSplit.set(true)"
          class="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5 -mt-5">
          <div class="w-14 h-14 bg-amber-400 hover:bg-amber-500 active:scale-95 rounded-full shadow-xl
                      flex items-center justify-center ring-4 ring-white transition-all duration-150">
            <span class="text-2xl leading-none">⚡</span>
          </div>
          <span class="text-[11px] font-bold tracking-wide text-amber-700">Quick</span>
        </button>

        <!-- Trips -->
        <button (click)="navigate('/trips')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'trips' ? 'text-indigo-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'trips' ? 'bg-indigo-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'trips' ? 'scale-110' : 'scale-100'">✈️</span>
          <span class="relative text-[11px] font-bold tracking-wide">Trips</span>
        </button>

        <!-- Settings -->
        <button (click)="navigate('/settings')"
          class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-all duration-200"
          [ngClass]="activeTab === 'settings' ? 'text-brand-600' : 'text-gray-400'">
          <div class="absolute inset-x-1.5 inset-y-1 rounded-xl transition-all duration-200"
            [ngClass]="activeTab === 'settings' ? 'bg-brand-50 opacity-100' : 'opacity-0'"></div>
          <span class="relative text-[22px] leading-none transition-transform duration-200"
            [ngClass]="activeTab === 'settings' ? 'scale-110' : 'scale-100'">⚙️</span>
          <span class="relative text-[11px] font-bold tracking-wide">Settings</span>
        </button>

      </div>
    </nav>

    <!-- Quick Split overlay (global) -->
    <app-quick-split *ngIf="showQuickSplit()" (close)="showQuickSplit.set(false)"></app-quick-split>

    <!-- ═══ BACKUP REMINDER (once per day, tab roots only) ═══ -->
    <div *ngIf="showNav && backupNudge()"
      class="fixed bottom-[5.25rem] left-4 right-4 z-40 max-w-sm mx-auto
             bg-amber-50 border border-amber-200 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3"
      style="animation: slideUp 0.3s ease-out">
      <span class="text-xl flex-shrink-0">🛟</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-amber-900">Back up your data</p>
        <p class="text-xs text-amber-700 mt-0.5">Your data lives only on this device — export a copy.</p>
      </div>
      <button (click)="backupNudge.set(false); navigate('/settings')"
        class="flex-shrink-0 bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
        Back up
      </button>
      <button (click)="backupNudge.set(false)"
        class="flex-shrink-0 text-amber-400 hover:text-amber-700 text-lg leading-none">×</button>
    </div>

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

    <!-- ═══ GLOBAL TOAST ═══ -->
    <div *ngIf="ui.toastState() as t"
      class="fixed left-4 right-4 z-[60] max-w-sm mx-auto bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-2.5"
      [class.bottom-24]="showNav" [class.bottom-6]="!showNav"
      style="animation: slideUp 0.28s ease-out">
      <span class="text-base flex-shrink-0">{{ t.icon }}</span>
      <p class="text-sm font-medium flex-1 min-w-0">{{ t.msg }}</p>
    </div>

    <!-- ═══ GLOBAL CONFIRM MODAL ═══ -->
    <div *ngIf="ui.confirmState() as c" class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="ui.resolveConfirm(false)"></div>
      <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm p-6"
        style="animation: confirmUp 0.25s cubic-bezier(.32,.72,0,1)">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
          [ngClass]="c.danger ? 'bg-rose-50' : 'bg-brand-50'">
          {{ c.danger ? '⚠️' : '❓' }}
        </div>
        <h3 class="text-lg font-bold text-gray-900 text-center">{{ c.title }}</h3>
        <p *ngIf="c.message" class="text-sm text-gray-500 text-center mt-2">{{ c.message }}</p>
        <div class="flex gap-3 mt-5">
          <button (click)="ui.resolveConfirm(false)"
            class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            {{ c.cancelText }}
          </button>
          <button (click)="ui.resolveConfirm(true)"
            class="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-colors"
            [ngClass]="c.danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-500 hover:bg-brand-600'">
            {{ c.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateY(80px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes confirmUp {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes shakeX {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-8px); }
      40%,80% { transform: translateX(8px); }
    }
    .shake { animation: shakeX 0.4s ease; }
  `]
})
export class AppComponent implements OnInit {
  private swUpdate     = inject(SwUpdate, { optional: true });
  private router       = inject(Router);
  readonly ui          = inject(UiService);
  private groupSvc     = inject(GroupService);
  private tripSvc      = inject(TripService);
  readonly lock        = inject(LockService);
  private theme        = inject(ThemeService);
  readonly updateReady  = signal(false);
  readonly showQuickSplit = signal(false);
  readonly backupNudge = signal(false);
  readonly pinEntry = signal('');
  readonly pinError = signal(false);
  activeTab: Tab = 'home';
  showNav = true;

  private nudgeChecked = false;

  constructor() {
    // Decide ONCE per app open (after data loads) whether to show the backup nudge.
    // Snoozes 24h via localStorage so it doesn't reappear on every refresh/navigation.
    effect(() => {
      const loading = this.groupSvc.isLoading() || this.tripSvc.isLoading();
      const count = this.groupSvc.groups().length + this.tripSvc.trips().length;
      if (loading || this.nudgeChecked) return;
      this.nudgeChecked = true;
      if (count === 0) return;
      const now = Date.now();
      const lastBackup = Number(localStorage.getItem('sk_lastBackupAt') || 0);
      const lastNudge  = Number(localStorage.getItem('sk_backupNudgedAt') || 0);
      const noRecentBackup = now - lastBackup > 7 * 24 * 60 * 60 * 1000;
      const notNudgedToday = now - lastNudge > 24 * 60 * 60 * 1000;
      if (noRecentBackup && notNudgedToday) {
        this.backupNudge.set(true);
        localStorage.setItem('sk_backupNudgedAt', String(now));
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.theme.apply();
    this.lock.init();
    this.setTab(this.router.url);

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => this.setTab((e as NavigationEnd).urlAfterRedirects));

    this.setupAutoUpdate();
  }

  /**
   * Keep an installed PWA fresh:
   *  - check for a new version at startup, every 60s, and whenever the app
   *    regains focus (reopen / tab switch back)
   *  - when a new version is ready, activate it and auto-reload the next time
   *    the app comes to the foreground (the natural "reopen" moment), so users
   *    don't get stuck on a stale version. A manual banner stays as a fallback.
   */
  private setupAutoUpdate(): void {
    const sw = this.swUpdate;
    if (!sw?.isEnabled) return;

    sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady.set(true);
        sw.activateUpdate().catch(() => {});
      });

    const check = () => sw.checkForUpdate().catch(() => {});
    check();
    setInterval(check, 60_000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (this.updateReady()) document.location.reload();
      else check();
    });
  }

  private setTab(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.showNav = TAB_ROOTS.includes(path);

    if (path === '/' || path === '') this.activeTab = 'home';
    else if (path === '/settings') this.activeTab = 'settings';
    else if (path.startsWith('/group') || path.startsWith('/new')) this.activeTab = 'groups';
    else if (path.startsWith('/trip')) this.activeTab = 'trips';
    else this.activeTab = '';
  }

  navigate(path: string): void { this.router.navigate([path]); }

  applyUpdate(): void { document.location.reload(); }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.lock.isLocked()) return;
    if (e.key >= '0' && e.key <= '9') { this.pressDigit(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { this.pressBack(); e.preventDefault(); }
  }

  pressDigit(d: string): void {
    if (this.pinEntry().length >= 4) return;
    const next = this.pinEntry() + d;
    this.pinEntry.set(next);
    this.pinError.set(false);
    if (next.length === 4) this.tryUnlock(next);
  }

  pressBack(): void {
    this.pinError.set(false);
    this.pinEntry.update(p => p.slice(0, -1));
  }

  private async tryUnlock(pin: string): Promise<void> {
    const ok = await this.lock.unlock(pin);
    if (ok) {
      this.pinEntry.set('');
    } else {
      this.pinError.set(true);
      setTimeout(() => this.pinEntry.set(''), 500);
    }
  }
}
