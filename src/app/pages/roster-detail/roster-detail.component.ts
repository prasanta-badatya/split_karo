import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RosterService } from '../../services/roster.service';
import { GroupService } from '../../services/group.service';
import { UiService } from '../../services/ui.service';
import { Roster, Member, Group } from '../../models/group.model';
import { formatCurrency, nanoid } from '../../utils/formatters';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-roster-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="goBack()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0">
            <app-icon name="arrow-left" class="w-5 h-5"></app-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="font-bold text-gray-900 text-sm truncate">{{ roster()?.name }}</h1>
            <p class="text-xs text-gray-400">{{ roster()?.members?.length || 0 }} members · {{ splits().length }} splits</p>
          </div>
          <button (click)="toggleArchive()" [title]="roster()?.archived ? 'Unarchive' : 'Archive'"
            class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors">
            <app-icon [name]="roster()?.archived ? 'unarchive' : 'archive'" class="w-5 h-5"></app-icon>
          </button>
        </div>
      </header>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex flex-col items-center justify-center min-h-[60vh]">
        <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <!-- Not found -->
      <div *ngIf="!isLoading() && !roster()" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div class="text-4xl mb-4">🔍</div>
        <h2 class="font-bold text-gray-700 text-lg">Group not found</h2>
        <button (click)="goBack()" class="mt-5 text-brand-600 font-semibold text-sm hover:underline">← Go Back</button>
      </div>

      <div *ngIf="roster() as r" class="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">

        <!-- New Split CTA -->
        <button (click)="newSplit()"
          class="w-full mb-6 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-sm shadow-md shadow-brand-200 hover:from-brand-600 hover:to-brand-700 transition-all flex items-center justify-center gap-2">
          <span class="text-lg leading-none">+</span> New Split
        </button>

        <!-- Members (roster) -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</h2>
            <button *ngIf="!isEditing()" (click)="startEdit()"
              class="text-xs font-semibold text-brand-600 hover:underline">✏️ Edit</button>
          </div>

          <!-- Read mode -->
          <div *ngIf="!isEditing()" class="p-4 flex flex-wrap gap-2">
            <span *ngFor="let m of r.members"
              class="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full pl-1.5 pr-3 py-1">
              <span class="w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {{ m.name.slice(0,2).toUpperCase() }}
              </span>
              <span class="text-sm font-medium text-gray-700">{{ m.name }}</span>
            </span>
          </div>

          <!-- Edit mode -->
          <div *ngIf="isEditing()" class="p-4 space-y-3">
            <input type="text" [(ngModel)]="editName"
              placeholder="Group name"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-300" />
            <div *ngFor="let m of editMembers(); let i = index; trackBy: trackId"
              class="bg-gray-50 rounded-xl p-3">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-7 h-7 rounded-lg bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {{ m.name.trim() ? m.name.trim().slice(0,2).toUpperCase() : (i+1) }}
                </div>
                <input type="text" [ngModel]="m.name" (ngModelChange)="patch(m.id,'name',$event)"
                  placeholder="Member name"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 min-w-0" />
                <button (click)="removeMember(m.id)" *ngIf="editMembers().length > 1"
                  class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-rose-500 rounded-lg flex-shrink-0">✕</button>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm">💸</span>
                <input type="text" [ngModel]="m.upiId" (ngModelChange)="patch(m.id,'upiId',$event)"
                  placeholder="UPI ID (optional)"
                  class="flex-1 text-xs text-gray-600 bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 min-w-0" />
              </div>
            </div>
            <button (click)="addMember()"
              class="w-full py-2.5 border-2 border-dashed border-brand-200 rounded-xl text-brand-500 font-semibold text-sm hover:bg-brand-50 transition-all">
              + Add Member
            </button>
            <div class="flex gap-2 pt-1">
              <button (click)="saveEdit()" [disabled]="isSaving()"
                class="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors">
                {{ isSaving() ? 'Saving…' : '✓ Save' }}
              </button>
              <button (click)="cancelEdit()"
                class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-400 font-semibold text-sm hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Splits -->
        <div class="flex items-center justify-between mb-3 px-1">
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Splits</h2>
        </div>

        <div *ngIf="splits().length === 0"
          class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center mb-6">
          <div class="text-4xl mb-3">🧾</div>
          <p class="font-bold text-gray-700 text-sm">No splits yet</p>
          <p class="text-xs text-gray-400 mt-1">Tap "New Split" to record this cycle's expenses</p>
        </div>

        <div *ngIf="splits().length > 0" class="space-y-2 mb-6">
          <div *ngFor="let s of splits()" (click)="openSplit(s.id)"
            class="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50 transition-colors">
            <div class="w-11 h-11 bg-brand-50 rounded-xl flex-shrink-0 flex items-center justify-center">
              <span class="text-lg">🧾</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 truncate text-sm">{{ s.cycleLabel || 'Split' }}</p>
              <p class="text-xs text-gray-400 truncate mt-0.5">{{ s.members.length }} members · {{ fmt(s.result.grandTotal) }}</p>
            </div>
            <span class="text-gray-300">›</span>
          </div>
        </div>

        <!-- Delete roster -->
        <button (click)="deleteRoster()"
          class="w-full py-3 rounded-xl border border-rose-200 text-rose-500 font-semibold text-sm hover:bg-rose-50 transition-colors">
          🗑 Delete Group
        </button>
      </div>
    </div>
  `,
})
export class RosterDetailComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private roster_ = inject(RosterService);
  private groups  = inject(GroupService);
  private ui      = inject(UiService);

  readonly fmt = formatCurrency;
  readonly rosterId = signal('');
  // Reactive: updates when IndexedDB finishes loading (handles hard refresh / cold start).
  readonly roster = computed(() => this.roster_.getRoster(this.rosterId()));
  readonly isLoading = this.roster_.isLoading;
  readonly isEditing = signal(false);
  readonly isSaving  = signal(false);

  editName = '';
  readonly editMembers = signal<Member[]>([]);

  readonly splits = computed<Group[]>(() =>
    this.groups.groups().filter(g => g.rosterId === this.rosterId())
  );

  ngOnInit(): void {
    this.rosterId.set(this.route.snapshot.paramMap.get('id') ?? '');
  }

  newSplit(): void {
    this.router.navigate(['/split/new'], { queryParams: { roster: this.rosterId() } });
  }

  openSplit(id: string): void { this.router.navigate(['/split', id]); }
  goBack(): void { this.router.navigate(['/groups']); }

  startEdit(): void {
    const r = this.roster();
    if (!r) return;
    this.editName = r.name;
    this.editMembers.set(r.members.map(m => ({ ...m })));
    this.isEditing.set(true);
  }

  cancelEdit(): void { this.isEditing.set(false); }

  addMember(): void {
    this.editMembers.update(ms => [...ms, {
      id: nanoid(), name: '', daysPresent: 15, includeRationVeg: true, personalExpensePaid: 0, upiId: '',
    }]);
  }

  patch(id: string, key: keyof Member, value: any): void {
    this.editMembers.update(ms => ms.map(m => m.id === id ? { ...m, [key]: value } : m));
  }

  removeMember(id: string): void {
    this.editMembers.update(ms => ms.filter(m => m.id !== id));
  }

  async saveEdit(): Promise<void> {
    const r = this.roster();
    if (!r) return;
    const name = this.editName.trim();
    if (!name) { this.ui.toast('Enter a group name', '⚠️'); return; }
    const members = this.editMembers().filter(m => m.name.trim()).map(m => ({ ...m, name: m.name.trim() }));
    if (members.length === 0) { this.ui.toast('At least one member', '⚠️'); return; }

    this.isSaving.set(true);
    const updated: Roster = { ...r, name, members };
    await this.roster_.updateRoster(updated);
    this.isEditing.set(false);
    this.isSaving.set(false);
    this.ui.toast('Group updated', '✅');
  }

  async toggleArchive(): Promise<void> {
    const r = this.roster();
    if (!r) return;
    const next = !r.archived;
    await this.roster_.setArchived(r.id, next);
    this.ui.toast(next ? 'Group archived' : 'Group unarchived', next ? '📦' : '↩️');
    if (next) this.router.navigate(['/groups']);
  }

  async deleteRoster(): Promise<void> {
    const r = this.roster();
    if (!r) return;
    const ok = await this.ui.confirm({
      title: `Delete "${r.name}"?`,
      message: `This deletes the group and all ${this.splits().length} of its splits. Cannot be undone.`,
      confirmText: 'Delete', cancelText: 'Keep', danger: true,
    });
    if (!ok) return;
    await this.roster_.deleteRoster(r.id);
    await this.groups.reload();
    this.ui.toast('Group deleted', '🗑');
    this.router.navigate(['/groups']);
  }

  trackId(_: number, m: Member): string { return m.id; }
}
