import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { GroupService } from '../../services/group.service';
import { TripService } from '../../services/trip.service';
import { UiService } from '../../services/ui.service';
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
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col pb-24">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="router.navigate(['/'])"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            ←
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
              <span class="text-white font-bold tracking-tight">SK</span>
            </div>
            <p class="font-bold text-gray-900">Split Karo</p>
            <p class="text-xs text-gray-400 mt-1">Smart expense splitter · Free · Offline</p>
            <p class="text-xs text-gray-300 mt-3">Works without internet · No signup · No ads</p>
          </div>
        </section>

      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly router    = inject(Router);
  private storage    = inject(StorageService);
  private groupSvc   = inject(GroupService);
  private tripSvc    = inject(TripService);
  private ui         = inject(UiService);

  readonly groups = this.groupSvc.groups;
  readonly trips  = this.tripSvc.trips;
  readonly isEmpty = computed(() => this.groups().length === 0 && this.trips().length === 0);

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
