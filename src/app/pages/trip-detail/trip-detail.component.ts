import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { UiService } from '../../services/ui.service';
import { Trip, TripExpense } from '../../models/trip.model';
import { buildUpiUri } from '../../utils/upi';

interface ExpenseEdit {
  id: string;
  description: string;
  amount: number | null;
  paidBy: string;
  splitAmong: Record<string, boolean>;
  date: string;
}

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="router.navigate(['/trips'])"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            ←
          </button>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 truncate">{{ trip()?.name }}</p>
            <p class="text-xs text-gray-400">{{ trip()?.members?.length }} members · {{ trip()?.expenses?.length }} expenses</p>
          </div>
          <button (click)="deleteTrip()"
            class="text-xs font-medium text-gray-300 hover:text-rose-500 transition-colors px-2 py-1 rounded">
            Delete
          </button>
        </div>
      </header>

      <div *ngIf="!trip()" class="flex-1 flex items-center justify-center">
        <p class="text-gray-400">Trip not found.</p>
      </div>

      <div *ngIf="trip() as t" class="max-w-3xl mx-auto w-full px-4 py-5 space-y-5">

        <!-- ══ SETTLEMENT PLAN ══ -->
        <section>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Settlement Plan</h2>
            <span class="text-xs font-semibold"
              [ngClass]="settledCount() === t.settlements.length && t.settlements.length > 0 ? 'text-emerald-600' : 'text-gray-400'">
              {{ settledCount() }}/{{ t.settlements.length }} done
            </span>
          </div>

          <!-- Progress bar -->
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4" *ngIf="t.settlements.length > 0">
            <div class="h-full rounded-full transition-all"
              [ngClass]="settledCount() === t.settlements.length ? 'bg-emerald-500' : 'bg-brand-400'"
              [style.width]="(settledCount() / t.settlements.length * 100) + '%'">
            </div>
          </div>

          <!-- All settled -->
          <div *ngIf="t.settlements.length === 0"
            class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
            <p class="text-emerald-700 font-semibold text-sm">✓ Everyone's square — no payments needed!</p>
          </div>

          <!-- Settlement cards -->
          <div class="space-y-2">
            <div *ngFor="let s of t.settlements; let i = index"
              class="bg-white rounded-xl border shadow-sm px-4 py-3 transition-colors"
              [ngClass]="s.paid ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100'">

              <div class="flex items-center gap-3">
                <!-- From avatar -->
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  [ngClass]="s.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-50 text-rose-500'">
                  {{ s.fromName.slice(0,2).toUpperCase() }}
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">
                    <span [ngClass]="s.paid ? 'text-emerald-700' : 'text-rose-500'">{{ s.fromName }}</span>
                    <span class="text-gray-400 font-normal mx-1">pays</span>
                    <span class="text-brand-600">{{ s.toName }}</span>
                  </p>
                  <p class="text-base font-bold mt-0.5" [ngClass]="s.paid ? 'text-emerald-600' : 'text-gray-900'">
                    ₹{{ s.amount | number:'1.0-2' }}
                  </p>
                </div>

                <button (click)="togglePaid(i)"
                  class="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border"
                  [ngClass]="s.paid
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-white'
                    : 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-500 hover:text-white hover:border-brand-500'">
                  {{ s.paid ? '✓ Paid' : 'Mark Paid' }}
                </button>
              </div>

              <!-- Pay via UPI / Remind row (unsettled only) -->
              <div *ngIf="!s.paid" class="flex items-center gap-2 mt-2.5">
                <a *ngIf="payeeUpi(s.to)" [href]="upiLink(s)"
                  class="flex-1 text-center text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                  💸 Pay {{ s.toName }} via UPI
                </a>
                <a [href]="whatsappLink(s)" target="_blank" rel="noopener"
                  class="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  [ngClass]="payeeUpi(s.to) ? 'flex-shrink-0' : 'flex-1 text-center'">
                  💬 Remind on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- ══ MEMBER BALANCES ══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Member Balances</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div *ngFor="let b of memberBalances(); let last = last"
              class="flex items-center gap-3 px-4 py-3"
              [ngClass]="!last ? 'border-b border-gray-50' : ''">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                [ngClass]="b.balance > 0.005 ? 'bg-emerald-50 text-emerald-700' : b.balance < -0.005 ? 'bg-rose-50 text-rose-500' : 'bg-gray-100 text-gray-500'">
                {{ b.name.slice(0,2).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ b.name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Paid ₹{{ b.paid | number:'1.0-2' }} · Owes ₹{{ b.owes | number:'1.0-2' }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-bold"
                  [ngClass]="b.balance > 0.005 ? 'text-emerald-600' : b.balance < -0.005 ? 'text-rose-500' : 'text-gray-400'">
                  {{ b.balance > 0.005 ? '+' : '' }}₹{{ b.balance | number:'1.0-2' }}
                </p>
                <p class="text-xs mt-0.5"
                  [ngClass]="b.balance > 0.005 ? 'text-emerald-500' : b.balance < -0.005 ? 'text-rose-400' : 'text-gray-400'">
                  {{ b.balance > 0.005 ? 'Gets back' : b.balance < -0.005 ? 'Owes' : 'Square' }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- ══ EXPENSE LOG ══ -->
        <section>
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expense Log</h2>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div *ngFor="let e of sortedExpenses(); let last = last"
              class="px-4 py-3"
              [ngClass]="!last ? 'border-b border-gray-50' : ''">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 bg-indigo-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0 mt-0.5 leading-none">
                  <span class="text-[9px] font-bold text-indigo-400 uppercase">{{ expDate(e) | date:'MMM' }}</span>
                  <span class="text-sm font-bold text-indigo-600">{{ expDate(e) | date:'d' }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">{{ e.description }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Paid by <span class="font-medium text-brand-600">{{ memberName(e.paidBy) }}</span>
                    · split among {{ splitNames(e) }}
                  </p>
                  <div class="flex items-center gap-3 mt-1.5">
                    <button (click)="openEditExpense(e)" class="text-xs font-semibold text-brand-600 hover:underline">Edit</button>
                    <button (click)="deleteExpense(e)" class="text-xs font-semibold text-gray-300 hover:text-rose-500">Delete</button>
                  </div>
                </div>
                <p class="text-sm font-bold text-gray-900 flex-shrink-0">₹{{ e.amount | number:'1.0-2' }}</p>
              </div>
            </div>
          </div>

          <!-- Grand total -->
          <div class="mt-2 bg-brand-500 rounded-xl px-4 py-3 flex items-center justify-between">
            <span class="text-sm font-semibold text-brand-100">Grand Total</span>
            <span class="text-lg font-bold text-white">₹{{ grandTotal() | number:'1.0-2' }}</span>
          </div>
        </section>

      </div>

      <!-- ═══ EDIT EXPENSE SHEET ═══ -->
      <div *ngIf="editExp() as ed" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="editExp.set(null)"></div>
        <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5"
          style="animation: sheetUp 0.25s cubic-bezier(.32,.72,0,1)">
          <h3 class="text-lg font-bold text-gray-900 mb-4">Edit expense</h3>

          <div class="flex gap-2 mb-3">
            <input [(ngModel)]="ed.description" type="text" placeholder="Description"
              class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <div class="relative w-28">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input [(ngModel)]="ed.amount" type="number" min="0" placeholder="0"
                class="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>

          <div class="flex items-center gap-2 mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">📅 Date</span>
            <input [(ngModel)]="ed.date" type="date"
              class="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="mb-3">
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Paid by</label>
            <div class="flex flex-wrap gap-1.5">
              <button *ngFor="let m of trip()?.members" (click)="ed.paidBy = m.id"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="ed.paidBy === m.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-200'">
                {{ m.name }}
              </button>
            </div>
          </div>

          <div class="mb-5">
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Split among</label>
            <div class="flex flex-wrap gap-1.5">
              <button *ngFor="let m of trip()?.members" (click)="ed.splitAmong[m.id] = !ed.splitAmong[m.id]"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="ed.splitAmong[m.id] ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-200'">
                {{ m.name }}
              </button>
            </div>
          </div>

          <div class="flex gap-3">
            <button (click)="editExp.set(null)"
              class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveExpense()" [disabled]="!canSaveExpense()"
              class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class TripDetailComponent {
  readonly router      = inject(Router);
  private route        = inject(ActivatedRoute);
  private tripService  = inject(TripService);
  private ui           = inject(UiService);

  readonly trip = computed(() => {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    return this.tripService.getTrip(id);
  });

  readonly settledCount = computed(() =>
    (this.trip()?.settlements ?? []).filter(s => s.paid).length,
  );

  readonly grandTotal = computed(() =>
    (this.trip()?.expenses ?? []).reduce((s, e) => s + e.amount, 0),
  );

  readonly memberBalances = computed(() => {
    const t = this.trip();
    if (!t) return [];
    return t.members.map(m => {
      const paid = t.expenses
        .filter(e => e.paidBy === m.id)
        .reduce((s, e) => s + e.amount, 0);
      const owes = t.expenses.reduce((s, e) => {
        if (!e.splitAmong.includes(m.id)) return s;
        return s + e.amount / e.splitAmong.length;
      }, 0);
      return { id: m.id, name: m.name, paid, owes, balance: paid - owes };
    });
  });

  // Expense log sorted by actual spend date (newest first)
  readonly sortedExpenses = computed(() => {
    const t = this.trip();
    if (!t) return [];
    return [...t.expenses].sort((a, b) => this.expDate(b).localeCompare(this.expDate(a)));
  });

  expDate(e: TripExpense): string {
    return e.date || (this.trip()?.createdAt ?? '').slice(0, 10);
  }

  memberName(id: string): string {
    return this.trip()?.members.find(m => m.id === id)?.name ?? id;
  }

  splitNames(e: TripExpense): string {
    const t = this.trip();
    if (!t) return '';
    return e.splitAmong.map(id => t.members.find(m => m.id === id)?.name ?? id).join(', ');
  }

  // ─── UPI / WhatsApp ───────────────────────────────────────────────
  payeeUpi(memberId: string): string {
    return this.trip()?.members.find(m => m.id === memberId)?.upiId ?? '';
  }

  upiLink(s: { to: string; toName: string; amount: number }): string {
    const t = this.trip();
    return buildUpiUri(this.payeeUpi(s.to), s.toName, s.amount, t ? `Split: ${t.name}` : 'Split Karo');
  }

  whatsappLink(s: { fromName: string; toName: string; amount: number; to: string }): string {
    const t = this.trip();
    const amt = (Math.round(s.amount * 100) / 100).toFixed(2);
    const upi = this.payeeUpi(s.to);
    let text = `Hi ${s.fromName}, please settle ₹${amt} to ${s.toName}`;
    if (t) text += ` for "${t.name}"`;
    if (upi) text += `. UPI: ${upi}`;
    text += ' — via Split Karo';
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  // ─── Edit / delete a single expense ───────────────────────────────
  readonly editExp = signal<ExpenseEdit | null>(null);

  openEditExpense(e: TripExpense): void {
    const splitAmong: Record<string, boolean> = {};
    (this.trip()?.members ?? []).forEach(m => (splitAmong[m.id] = e.splitAmong.includes(m.id)));
    this.editExp.set({
      id: e.id,
      description: e.description,
      amount: e.amount,
      paidBy: e.paidBy,
      splitAmong,
      date: this.expDate(e),
    });
  }

  canSaveExpense(): boolean {
    const ed = this.editExp();
    if (!ed) return false;
    return !!ed.description.trim()
      && Number(ed.amount) > 0
      && !!ed.paidBy
      && Object.values(ed.splitAmong).some(v => v);
  }

  async saveExpense(): Promise<void> {
    const t = this.trip();
    const ed = this.editExp();
    if (!t || !ed || !this.canSaveExpense()) return;
    const expenses: TripExpense[] = t.expenses.map(e => e.id === ed.id ? {
      id: ed.id,
      description: ed.description.trim(),
      amount: Number(ed.amount),
      paidBy: ed.paidBy,
      splitAmong: Object.entries(ed.splitAmong).filter(([, v]) => v).map(([k]) => k),
      date: ed.date,
    } : e);
    await this.tripService.updateTrip({ ...t, expenses });
    this.editExp.set(null);
    this.ui.toast('Expense updated', '✅');
  }

  async deleteExpense(e: TripExpense): Promise<void> {
    const t = this.trip();
    if (!t) return;
    if (t.expenses.length <= 1) {
      this.ui.toast('A trip needs at least one expense', '⚠️');
      return;
    }
    const ok = await this.ui.confirm({
      title: 'Delete this expense?',
      message: `"${e.description}" (₹${e.amount}) will be removed and settlements recalculated.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await this.tripService.updateTrip({ ...t, expenses: t.expenses.filter(x => x.id !== e.id) });
    this.ui.toast('Expense deleted', '🗑️');
  }

  async togglePaid(index: number): Promise<void> {
    const t = this.trip();
    if (!t) return;
    await this.tripService.toggleSettlementPaid(t.id, index);
  }

  async deleteTrip(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    const ok = await this.ui.confirm({
      title: 'Delete this trip?',
      message: `"${t.name}" and its settlements will be removed.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await this.tripService.deleteTrip(t.id);
    this.ui.toast('Trip deleted', '🗑️');
    this.router.navigate(['/trips']);
  }
}
