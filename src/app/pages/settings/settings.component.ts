import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { GroupService } from '../../services/group.service';
import { TripService } from '../../services/trip.service';
import { UiService } from '../../services/ui.service';
import { ThemeService } from '../../services/theme.service';
import { LockService } from '../../services/lock.service';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { IconComponent } from '../../components/icon/icon.component';
import { Group } from '../../models/group.model';
import { Trip } from '../../models/trip.model';

interface BackupFile {
  app: 'split-karo';
  version: number;
  exportedAt: string;
  groups: Group[];
  trips: Trip[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ThemeToggleComponent, IconComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col pb-24">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="router.navigate(['/'])"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <app-icon name="arrow-left" class="w-5 h-5"></app-icon>
          </button>
          <span class="font-bold text-gray-900">Settings</span>
        </div>
      </header>

      <div class="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">

        <!-- ═══ DATA SUMMARY ═══ -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p class="text-3xl font-bold text-brand-600">{{ groups().length }}</p>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Groups</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p class="text-3xl font-bold text-indigo-600">{{ trips().length }}</p>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Trips</p>
          </div>
        </div>

        <!-- ═══ BACKUP & RESTORE ═══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Backup &amp; Restore</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">

            <!-- Export -->
            <button (click)="exportData()" [disabled]="isEmpty()"
              class="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📤</div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">Export Backup</p>
                <p class="text-xs text-gray-400 mt-0.5">Download all groups &amp; trips as a file</p>
              </div>
              <span class="text-gray-300 text-lg">›</span>
            </button>

            <!-- Import -->
            <label class="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📥</div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">Import Backup</p>
                <p class="text-xs text-gray-400 mt-0.5">Restore from a backup file (merges with existing)</p>
              </div>
              <span class="text-gray-300 text-lg">›</span>
              <input type="file" accept="application/json,.json" class="hidden" (change)="importData($event)" />
            </label>

          </div>
          <p class="text-xs text-gray-400 mt-2 px-1">
            💡 Your data lives only on this device. Export regularly so you don't lose it if the app cache is cleared.
          </p>
        </section>

        <!-- ═══ APPEARANCE ═══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Appearance</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="w-full flex items-center gap-4 px-4 py-4">
              <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {{ theme.theme() === 'dark' ? '🌙' : '☀️' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">Dark mode</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ theme.theme() === 'dark' ? 'On' : 'Off' }}</p>
              </div>
              <app-theme-toggle></app-theme-toggle>
            </div>
          </div>
        </section>

        <!-- ═══ PRIVACY / APP LOCK ═══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">Privacy</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div class="w-full flex items-center gap-4 px-4 py-4">
              <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🔒</div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">App Lock (PIN)</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ lock.hasPin() ? 'On — asks for a PIN on open' : 'Off — anyone can open the app' }}</p>
              </div>
              <button *ngIf="!lock.hasPin()" (click)="openSetPin()"
                class="flex-shrink-0 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Set PIN</button>
              <button *ngIf="lock.hasPin()" (click)="removePin()"
                class="flex-shrink-0 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Remove</button>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-2 px-1">A screen lock for casual privacy. Keep a backup — there's no PIN recovery.</p>
        </section>

        <!-- ═══ DANGER ZONE ═══ -->
        <section>
          <h2 class="text-xs font-semibold text-rose-400 uppercase tracking-wide mb-3 px-1">Danger Zone</h2>
          <div class="bg-white rounded-2xl border border-rose-100 shadow-sm">
            <button (click)="clearAll()" [disabled]="isEmpty()"
              class="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <div class="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🗑️</div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-rose-600 text-sm">Clear All Data</p>
                <p class="text-xs text-gray-400 mt-0.5">Permanently delete every group and trip</p>
              </div>
            </button>
          </div>
        </section>

        <!-- ═══ ABOUT ═══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">About</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div class="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-3">
              <svg viewBox="0 0 32 32" fill="none" class="w-7 h-7">
                <circle cx="16" cy="16" r="11" fill="#ffffff"/>
                <path d="M17.3 7 L13.4 16 L16.6 16 L14.7 25 L19.8 14.7 L16.6 14.7 Z" fill="#4338ca"/>
              </svg>
            </div>
            <p class="font-bold text-gray-900">Split Karo</p>
            <p class="text-xs text-gray-400 mt-1">Smart expense splitter · Free · Offline</p>
            <p class="text-xs text-gray-300 mt-3">Works without internet · No signup · No ads</p>
          </div>
        </section>

      </div>

      <!-- ═══ SET PIN MODAL ═══ -->
      <div *ngIf="settingPin()" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="cancelSetPin()"></div>
        <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm p-6"
          style="animation: sheetUp 0.25s cubic-bezier(.32,.72,0,1)">
          <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🔒</div>
          <h3 class="text-lg font-bold text-gray-900 text-center">{{ pinStep() === 1 ? 'Choose a 4-digit PIN' : 'Confirm your PIN' }}</h3>
          <p class="text-sm text-gray-500 text-center mt-1">{{ pinStep() === 1 ? 'You\\'ll enter this each time you open the app.' : 'Type it once more to confirm.' }}</p>
          <input #pinInput type="tel" inputmode="numeric" maxlength="4"
            [(ngModel)]="pinValue" (ngModelChange)="onPinInput($event)"
            class="mt-5 w-full text-center text-3xl tracking-[0.6em] font-bold border-2 border-gray-200 focus:border-brand-400 rounded-2xl py-3 focus:outline-none" />
          <p *ngIf="pinMsg()" class="text-center text-xs text-rose-500 font-semibold mt-2">{{ pinMsg() }}</p>
          <button (click)="cancelSetPin()" class="mt-5 w-full text-gray-400 text-sm py-2">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class SettingsComponent {
  readonly router    = inject(Router);
  private storage    = inject(StorageService);
  private groupSvc   = inject(GroupService);
  private tripSvc    = inject(TripService);
  private ui         = inject(UiService);
  readonly theme     = inject(ThemeService);
  readonly lock      = inject(LockService);

  readonly groups = this.groupSvc.groups;
  readonly trips  = this.tripSvc.trips;
  readonly isEmpty = computed(() => this.groups().length === 0 && this.trips().length === 0);

  // Set-PIN modal state
  readonly settingPin = signal(false);
  readonly pinStep    = signal<1 | 2>(1);
  readonly pinMsg     = signal('');
  pinValue = '';
  private firstPin = '';

  openSetPin(): void {
    this.settingPin.set(true);
    this.pinStep.set(1);
    this.pinValue = '';
    this.firstPin = '';
    this.pinMsg.set('');
  }

  cancelSetPin(): void {
    this.settingPin.set(false);
    this.pinValue = '';
    this.firstPin = '';
  }

  onPinInput(v: string): void {
    const digits = (v || '').replace(/\D/g, '').slice(0, 4);
    this.pinValue = digits;
    this.pinMsg.set('');
    if (digits.length !== 4) return;

    if (this.pinStep() === 1) {
      this.firstPin = digits;
      this.pinStep.set(2);
      this.pinValue = '';
    } else {
      if (digits === this.firstPin) {
        this.lock.setPin(digits).then(() => {
          this.settingPin.set(false);
          this.ui.toast('App lock enabled', '🔒');
        });
      } else {
        this.pinMsg.set("PINs didn't match — start again");
        this.pinStep.set(1);
        this.pinValue = '';
        this.firstPin = '';
      }
    }
  }

  async removePin(): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Remove app lock?',
      message: 'The app will open without asking for a PIN.',
      confirmText: 'Remove',
      danger: true,
    });
    if (!ok) return;
    this.lock.removePin();
    this.ui.toast('App lock removed');
  }

  exportData(): void {
    const backup: BackupFile = {
      app: 'split-karo',
      version: 2,
      exportedAt: new Date().toISOString(),
      groups: this.groups(),
      trips: this.trips(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `split-karo-backup-${stamp}.json`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('sk_lastBackupAt', String(Date.now()));
    this.ui.toast('Backup downloaded');
  }

  async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<BackupFile>;
      if (data.app !== 'split-karo' || !Array.isArray(data.groups) || !Array.isArray(data.trips)) {
        this.ui.toast('Not a valid Split Karo backup', '❌');
        input.value = '';
        return;
      }
      if (data.groups.length) await this.storage.bulkSave(data.groups);
      if (data.trips.length)  await this.storage.bulkSaveTrips(data.trips);
      await Promise.all([this.groupSvc.reload(), this.tripSvc.reload()]);
      this.ui.toast(`Imported ${data.groups.length} groups, ${data.trips.length} trips`);
    } catch {
      this.ui.toast('Could not read that file', '❌');
    } finally {
      input.value = '';
    }
  }

  async clearAll(): Promise<void> {
    const ok = await this.ui.confirm({
      title: 'Clear all data?',
      message: `This permanently deletes all ${this.groups().length} groups and ${this.trips().length} trips. Export a backup first if unsure.`,
      confirmText: 'Delete All',
      danger: true,
    });
    if (!ok) return;
    await this.storage.clearAll();
    await Promise.all([this.groupSvc.reload(), this.tripSvc.reload()]);
    this.ui.toast('All data cleared', '🗑️');
  }
}
