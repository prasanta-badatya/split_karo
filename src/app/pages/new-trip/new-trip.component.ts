import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { TripMember, TripExpense, Trip } from '../../models/trip.model';
import { calculateSettlements } from '../../utils/trip-calculator';

interface ExpenseRow {
  id: string;
  description: string;
  amount: number | null;
  paidBy: string;
  splitAmong: Record<string, boolean>;
  date: string;
  splitType: 'equal' | 'exact';
  splits: Record<string, number | null>;
}

@Component({
  selector: 'app-new-trip',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="goBack()"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            ←
          </button>
          <span class="font-bold text-gray-900">New Trip</span>
          <!-- Step indicator -->
          <div class="ml-auto flex items-center gap-1.5">
            <div *ngFor="let s of [1,2,3]"
              class="h-1.5 rounded-full transition-all"
              [ngClass]="s <= step() ? 'bg-brand-500 w-6' : 'bg-gray-200 w-4'">
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-2xl mx-auto w-full px-4 py-6 flex-1">

        <!-- ═══ STEP 1: Trip Info ═══ -->
        <div *ngIf="step() === 1">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Trip details</h2>
          <p class="text-sm text-gray-400 mb-6">Give your trip a name</p>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Trip Name *</label>
              <input [(ngModel)]="tripName" type="text" placeholder="e.g. Goa Trip, Office Picnic"
                class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent" />
            </div>
          </div>

          <button (click)="step.set(2)" [disabled]="!tripName.trim()"
            class="mt-6 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-sm">
            Next: Add Members →
          </button>
        </div>

        <!-- ═══ STEP 2: Members ═══ -->
        <div *ngIf="step() === 2">
          <h2 class="text-lg font-bold text-gray-900 mb-1">Who's coming?</h2>
          <p class="text-sm text-gray-400 mb-6">Add all trip members</p>

          <div class="space-y-2 mb-3">
            <div *ngFor="let m of members(); let i = index"
              class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  {{ m.name ? m.name.slice(0,2).toUpperCase() : '?' }}
                </div>
                <input [(ngModel)]="m.name" type="text" placeholder="Member name"
                  class="flex-1 text-sm font-medium text-gray-900 bg-transparent focus:outline-none placeholder-gray-300" />
                <button (click)="removeMember(i)" *ngIf="members().length > 2"
                  class="text-gray-200 hover:text-rose-400 transition-colors text-lg leading-none">×</button>
              </div>
              <div class="flex items-center gap-2 mt-2 pl-11">
                <span class="text-sm">💸</span>
                <input [(ngModel)]="m.upiId" type="text" placeholder="UPI ID (optional, for collecting)"
                  class="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300" />
              </div>
            </div>
          </div>

          <button (click)="addMember()"
            class="w-full border-2 border-dashed border-gray-200 hover:border-brand-300 text-gray-400 hover:text-brand-500 rounded-xl py-3 text-sm font-semibold transition-colors">
            + Add Member
          </button>

          <button (click)="goToExpenses()" [disabled]="!canProceedToExpenses()"
            class="mt-6 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-sm">
            Next: Add Expenses →
          </button>
          <button (click)="step.set(1)" class="mt-2 w-full text-gray-400 text-sm py-2">← Back</button>
        </div>

        <!-- ═══ STEP 3: Expenses ═══ -->
        <div *ngIf="step() === 3">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-lg font-bold text-gray-900">Expenses</h2>
            <span class="text-sm font-bold text-brand-600">Total: ₹{{ runningTotal() | number:'1.0-2' }}</span>
          </div>
          <p class="text-sm text-gray-400 mb-5">Add each expense and who paid / who shares it</p>

          <div class="space-y-3 mb-3">
            <div *ngFor="let exp of expenseRows(); let i = index"
              class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

              <!-- Row 1: description + amount -->
              <div class="flex gap-2 mb-2">
                <input [(ngModel)]="exp.description" type="text" placeholder="Description (e.g. Hotel)"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div class="relative w-28">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input [(ngModel)]="exp.amount" type="number" placeholder="0" min="0"
                    class="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              <!-- Row 1b: date -->
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">📅 Date</span>
                <input [(ngModel)]="exp.date" type="date"
                  class="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <!-- Row 2: paid by -->
              <div class="mb-3">
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Paid by</label>
                <div class="flex flex-wrap gap-1.5">
                  <button *ngFor="let m of validMembers()"
                    (click)="exp.paidBy = m.id"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border"
                    [ngClass]="exp.paidBy === m.id
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-300'">
                    {{ m.name }}
                  </button>
                </div>
              </div>

              <!-- Row 3: split among -->
              <div>
                <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Split among</label>
                <div class="flex flex-wrap gap-1.5">
                  <button *ngFor="let m of validMembers()"
                    (click)="toggleSplit(exp, m.id)"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border"
                    [ngClass]="exp.splitAmong[m.id]
                      ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-indigo-200'">
                    {{ m.name }}
                  </button>
                </div>
              </div>

              <!-- Row 4: split type -->
              <div class="mt-3 flex gap-2">
                <button (click)="exp.splitType = 'equal'"
                  class="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  [ngClass]="exp.splitType === 'equal' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-200'">
                  ⚖️ Equally
                </button>
                <button (click)="exp.splitType = 'exact'"
                  class="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  [ngClass]="exp.splitType === 'exact' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-200'">
                  ✏️ Exact
                </button>
              </div>

              <!-- Exact amount inputs -->
              <div *ngIf="exp.splitType === 'exact'" class="mt-2 space-y-1.5">
                <ng-container *ngFor="let m of validMembers()">
                  <div *ngIf="exp.splitAmong[m.id]" class="flex items-center gap-2">
                    <span class="text-sm text-gray-700 flex-1 min-w-0 truncate">{{ m.name }}</span>
                    <div class="relative w-24">
                      <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input [(ngModel)]="exp.splits[m.id]" type="number" min="0" placeholder="0"
                        class="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                </ng-container>
                <div class="flex items-center justify-between text-xs font-semibold rounded-lg px-2.5 py-1.5"
                  [ngClass]="exactBalanced(exp) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
                  <span>{{ exactBalanced(exp) ? '✓ Matches' : 'Assigned' }}</span>
                  <span>₹{{ exactAssigned(exp) | number:'1.0-2' }} / ₹{{ +(exp.amount || 0) | number:'1.0-2' }}</span>
                </div>
              </div>

              <!-- Delete expense -->
              <div class="flex justify-end mt-3" *ngIf="expenseRows().length > 1">
                <button (click)="removeExpense(i)"
                  class="text-xs text-gray-300 hover:text-rose-400 transition-colors">Remove</button>
              </div>
            </div>
          </div>

          <button (click)="addExpense()"
            class="w-full border-2 border-dashed border-gray-200 hover:border-brand-300 text-gray-400 hover:text-brand-500 rounded-xl py-3 text-sm font-semibold transition-colors">
            + Add Expense
          </button>

          <button (click)="save()" [disabled]="saving() || !canSave()"
            class="mt-6 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            <span *ngIf="saving()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ saving() ? 'Saving…' : 'Calculate & Save' }}
          </button>
          <button (click)="step.set(2)" class="mt-2 w-full text-gray-400 text-sm py-2">← Back</button>
        </div>

      </div>
    </div>
  `,
})
export class NewTripComponent {
  private router      = inject(Router);
  private tripService = inject(TripService);

  readonly step     = signal<1 | 2 | 3>(1);
  readonly saving   = signal(false);
  tripName = '';

  readonly members = signal<{ id: string; name: string; upiId: string }[]>([
    { id: crypto.randomUUID(), name: '', upiId: '' },
    { id: crypto.randomUUID(), name: '', upiId: '' },
  ]);

  readonly expenseRows = signal<ExpenseRow[]>([this.blankRow()]);

  readonly validMembers = computed(() => this.members().filter(m => m.name.trim()));

  readonly runningTotal = computed(() =>
    this.expenseRows().reduce((s, e) => s + (Number(e.amount) || 0), 0),
  );

  addMember(): void {
    this.members.update(ms => [...ms, { id: crypto.randomUUID(), name: '', upiId: '' }]);
  }

  removeMember(i: number): void {
    this.members.update(ms => ms.filter((_, idx) => idx !== i));
  }

  canProceedToExpenses(): boolean {
    return this.members().filter(m => m.name.trim()).length >= 2;
  }

  goToExpenses(): void {
    // Reset expense rows with fresh defaults based on current members
    const row = this.blankRow();
    const vm = this.validMembers();
    vm.forEach(m => (row.splitAmong[m.id] = true));
    if (vm.length > 0) row.paidBy = vm[0].id;
    this.expenseRows.set([row]);
    this.step.set(3);
  }

  private blankRow(): ExpenseRow {
    return {
      id: crypto.randomUUID(),
      description: '',
      amount: null,
      paidBy: '',
      splitAmong: {},
      date: new Date().toISOString().slice(0, 10),
      splitType: 'equal',
      splits: {},
    };
  }

  exactAssigned(exp: ExpenseRow): number {
    return Object.keys(exp.splitAmong)
      .filter(id => exp.splitAmong[id])
      .reduce((s, id) => s + (Number(exp.splits[id]) || 0), 0);
  }

  exactBalanced(exp: ExpenseRow): boolean {
    return Math.abs(this.exactAssigned(exp) - (Number(exp.amount) || 0)) < 0.01 && (Number(exp.amount) || 0) > 0;
  }

  addExpense(): void {
    const row = this.blankRow();
    // default: all valid members checked
    this.validMembers().forEach(m => (row.splitAmong[m.id] = true));
    this.expenseRows.update(rows => [...rows, row]);
  }

  removeExpense(i: number): void {
    this.expenseRows.update(rows => rows.filter((_, idx) => idx !== i));
  }

  toggleSplit(exp: ExpenseRow, memberId: string): void {
    exp.splitAmong[memberId] = !exp.splitAmong[memberId];
    // trigger signal update
    this.expenseRows.update(rows => [...rows]);
  }

  canSave(): boolean {
    return this.expenseRows().every(e =>
      e.description.trim() &&
      Number(e.amount) > 0 &&
      e.paidBy &&
      Object.values(e.splitAmong).some(v => v) &&
      (e.splitType !== 'exact' || this.exactBalanced(e)),
    );
  }

  async save(): Promise<void> {
    this.saving.set(true);
    const validM = this.validMembers();
    const members: TripMember[] = validM.map(m => ({
      id: m.id,
      name: m.name.trim(),
      ...(m.upiId.trim() ? { upiId: m.upiId.trim() } : {}),
    }));
    const expenses: TripExpense[] = this.expenseRows().map(e => {
      const splitAmong = Object.entries(e.splitAmong).filter(([, v]) => v).map(([k]) => k);
      const splits: Record<string, number> = {};
      if (e.splitType === 'exact') splitAmong.forEach(id => (splits[id] = Number(e.splits[id]) || 0));
      return {
        id: e.id,
        description: e.description.trim(),
        amount: Number(e.amount),
        paidBy: e.paidBy,
        splitAmong,
        date: e.date || new Date().toISOString().slice(0, 10),
        splitType: e.splitType,
        ...(e.splitType === 'exact' ? { splits } : {}),
      };
    });
    const settlements = calculateSettlements(members, expenses, true);
    const trip: Trip = {
      id: crypto.randomUUID(),
      name: this.tripName.trim(),
      createdAt: new Date().toISOString(),
      members,
      expenses,
      settlements,
      simplifyDebts: true,
    };
    await this.tripService.addTrip(trip);
    this.router.navigate(['/trip', trip.id]);
  }

  goBack(): void {
    if (this.step() === 1) this.router.navigate(['/trips']);
    else this.step.update(s => (s - 1) as 1 | 2 | 3);
  }
}
