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
              class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                {{ m.name ? m.name.slice(0,2).toUpperCase() : '?' }}
              </div>
              <input [(ngModel)]="m.name" type="text" placeholder="Member name"
                class="flex-1 text-sm font-medium text-gray-900 bg-transparent focus:outline-none placeholder-gray-300" />
              <button (click)="removeMember(i)" *ngIf="members().length > 2"
                class="text-gray-200 hover:text-rose-400 transition-colors text-lg leading-none">×</button>
            </div>
          </div>

          <button (click)="addMember()"
            class="w-full border-2 border-dashed border-gray-200 hover:border-brand-300 text-gray-400 hover:text-brand-500 rounded-xl py-3 text-sm font-semibold transition-colors">
            + Add Member
          </button>

          <button (click)="step.set(3)" [disabled]="!canProceedToExpenses()"
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
              <div class="flex gap-2 mb-3">
                <input [(ngModel)]="exp.description" type="text" placeholder="Description (e.g. Hotel)"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div class="relative w-28">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input [(ngModel)]="exp.amount" type="number" placeholder="0" min="0"
                    class="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
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

  readonly members = signal<{ id: string; name: string }[]>([
    { id: crypto.randomUUID(), name: '' },
    { id: crypto.randomUUID(), name: '' },
  ]);

  readonly expenseRows = signal<ExpenseRow[]>([this.blankRow()]);

  readonly validMembers = computed(() => this.members().filter(m => m.name.trim()));

  readonly runningTotal = computed(() =>
    this.expenseRows().reduce((s, e) => s + (Number(e.amount) || 0), 0),
  );

  addMember(): void {
    this.members.update(ms => [...ms, { id: crypto.randomUUID(), name: '' }]);
  }

  removeMember(i: number): void {
    this.members.update(ms => ms.filter((_, idx) => idx !== i));
  }

  canProceedToExpenses(): boolean {
    return this.members().filter(m => m.name.trim()).length >= 2;
  }

  private blankRow(): ExpenseRow {
    return {
      id: crypto.randomUUID(),
      description: '',
      amount: null,
      paidBy: '',
      splitAmong: {},
    };
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
      Object.values(e.splitAmong).some(v => v),
    );
  }

  async save(): Promise<void> {
    this.saving.set(true);
    const validM = this.validMembers();
    const members: TripMember[] = validM.map(m => ({ id: m.id, name: m.name.trim() }));
    const expenses: TripExpense[] = this.expenseRows().map(e => ({
      id: e.id,
      description: e.description.trim(),
      amount: Number(e.amount),
      paidBy: e.paidBy,
      splitAmong: Object.entries(e.splitAmong).filter(([, v]) => v).map(([k]) => k),
    }));
    const settlements = calculateSettlements(members, expenses);
    const trip: Trip = {
      id: crypto.randomUUID(),
      name: this.tripName.trim(),
      createdAt: new Date().toISOString(),
      members,
      expenses,
      settlements,
    };
    await this.tripService.addTrip(trip);
    this.router.navigate(['/trip', trip.id]);
  }

  goBack(): void {
    if (this.step() === 1) this.router.navigate(['/trips']);
    else this.step.update(s => (s - 1) as 1 | 2 | 3);
  }
}
