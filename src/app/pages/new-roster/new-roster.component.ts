import { Component, inject, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RosterService } from '../../services/roster.service';
import { UiService } from '../../services/ui.service';
import { nanoid } from '../../utils/formatters';
import { Member, Roster } from '../../models/group.model';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-new-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="back()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0">
            <app-icon name="arrow-left" class="w-5 h-5"></app-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-gray-900">New Group</h1>
            <p class="text-xs text-gray-400">Add people once — reuse every split</p>
          </div>
        </div>
      </header>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-5">

          <!-- Group name -->
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Group Name <span class="text-rose-400">*</span>
            </label>
            <input type="text" [(ngModel)]="name"
              placeholder="e.g. Room 5, Flat 2B"
              class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all placeholder:text-gray-300" />
            <p class="text-xs text-gray-400 mt-2">This is the people you split with — rent, ration, trips. Members stay saved.</p>
          </div>

          <!-- Members -->
          <div>
            <div class="flex items-center justify-between mb-2 px-1">
              <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</h2>
              <span class="text-xs text-gray-400">{{ members().length }} added</span>
            </div>

            <!-- Empty -->
            <div *ngIf="members().length === 0"
              class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center mb-3">
              <div class="text-4xl mb-3">👥</div>
              <p class="font-bold text-gray-700 text-sm">No members yet</p>
              <p class="text-xs text-gray-400 mt-1 mb-4">Add everyone who shares expenses</p>
              <button (click)="addMember()"
                class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
                <span class="text-lg leading-none">+</span> Add First Member
              </button>
            </div>

            <!-- Cards -->
            <div *ngIf="members().length > 0" class="space-y-3">
              <div *ngFor="let m of members(); let i = index; trackBy: trackId"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div class="flex items-center gap-2.5 mb-3">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    [ngClass]="m.name.trim() ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'">
                    {{ m.name.trim() ? m.name.trim().slice(0,2).toUpperCase() : (i + 1) }}
                  </div>
                  <input type="text" #nameInput
                    [ngModel]="m.name" (ngModelChange)="patch(m.id, 'name', $event)"
                    placeholder="Member name"
                    class="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all min-w-0" />
                  <button (click)="remove(m.id)"
                    class="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">✕</button>
                </div>

                <!-- UPI -->
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-sm">💸</span>
                  <input type="text" [ngModel]="m.upiId" (ngModelChange)="patch(m.id, 'upiId', $event)"
                    placeholder="UPI ID (optional, for collecting)"
                    class="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300 min-w-0" />
                </div>

                <!-- include in ration/veg by default -->
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" [ngModel]="m.includeRationVeg" (ngModelChange)="patch(m.id, 'includeRationVeg', $event)"
                    class="w-4 h-4 rounded accent-orange-500 cursor-pointer" />
                  <span class="text-sm text-gray-600 font-medium">🛒🥦 Usually shares Ration &amp; Veggie</span>
                </label>
              </div>

              <button (click)="addMember()"
                class="w-full py-3 border-2 border-dashed border-brand-200 rounded-xl text-brand-500 font-semibold text-sm hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center justify-center gap-2">
                <span class="text-base leading-none">+</span> Add Another Member
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-20">
        <div class="max-w-3xl mx-auto px-4 py-3">
          <button (click)="save()" [disabled]="isSaving()"
            class="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-all">
            {{ isSaving() ? 'Saving…' : 'Create Group →' }}
          </button>
        </div>
      </div>

    </div>
  `,
})
export class NewRosterComponent {
  private router  = inject(Router);
  private roster  = inject(RosterService);
  private ui      = inject(UiService);

  @ViewChildren('nameInput') nameInputs!: QueryList<ElementRef<HTMLInputElement>>;

  name = '';
  readonly members  = signal<Member[]>([]);
  readonly isSaving = signal(false);

  back(): void { this.router.navigate(['/groups']); }

  addMember(): void {
    this.members.update(ms => [...ms, {
      id: nanoid(), name: '', daysPresent: 15, includeRationVeg: true, personalExpensePaid: 0, upiId: '',
    }]);
    setTimeout(() => {
      const inputs = this.nameInputs.toArray();
      if (inputs.length) inputs[inputs.length - 1].nativeElement.focus();
    }, 50);
  }

  patch(id: string, key: keyof Member, value: any): void {
    this.members.update(ms => ms.map(m => m.id === id ? { ...m, [key]: value } : m));
  }

  remove(id: string): void {
    this.members.update(ms => ms.filter(m => m.id !== id));
  }

  async save(): Promise<void> {
    const name = this.name.trim();
    if (!name) { this.ui.toast('Please enter a group name', '⚠️'); return; }
    const members = this.members().filter(m => m.name.trim());
    if (members.length === 0) { this.ui.toast('Add at least one member', '⚠️'); return; }

    this.isSaving.set(true);
    const roster: Roster = {
      id: nanoid(),
      name,
      members: members.map(m => ({ ...m, name: m.name.trim() })),
      createdAt: new Date().toISOString(),
    };
    await this.roster.addRoster(roster);
    this.ui.toast('Group created', '🎉');
    this.router.navigate(['/group', roster.id]);
  }

  trackId(_: number, m: Member): string { return m.id; }
}
