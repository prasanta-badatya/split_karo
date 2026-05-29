import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { UiService } from '../../services/ui.service';
import { Trip, TripExpense } from '../../models/trip.model';

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule],
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
              class="bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 transition-colors"
              [ngClass]="s.paid ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100'">

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
            <div *ngFor="let e of t.expenses; let last = last"
              class="px-4 py-3"
              [ngClass]="!last ? 'border-b border-gray-50' : ''">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span class="text-sm">🧾</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">{{ e.description }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    Paid by <span class="font-medium text-brand-600">{{ memberName(e.paidBy) }}</span>
                    · split among {{ splitNames(e) }}
                  </p>
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
    </div>
  `,
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

  memberName(id: string): string {
    return this.trip()?.members.find(m => m.id === id)?.name ?? id;
  }

  splitNames(e: TripExpense): string {
    const t = this.trip();
    if (!t) return '';
    return e.splitAmong.map(id => t.members.find(m => m.id === id)?.name ?? id).join(', ');
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
