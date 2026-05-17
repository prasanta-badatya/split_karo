import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div class="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="goBack()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-lg flex-shrink-0">
            ←
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="font-bold text-gray-900 text-sm truncate">{{ group()?.name }}</h1>
            <p class="text-xs text-gray-400 truncate">{{ group()?.cycleLabel }}</p>
          </div>
          <button (click)="share()"
            class="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>
      </header>

      <!-- Not Found -->
      <div *ngIf="!group()" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div class="text-4xl mb-4">🔍</div>
        <h2 class="font-bold text-gray-700 text-lg">Group not found</h2>
        <button (click)="goBack()" class="mt-5 text-brand-600 font-semibold text-sm hover:underline">← Go Back</button>
      </div>

      <!-- Content -->
      <div *ngIf="group() as g" class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        <!-- Verification Badge -->
        <div class="mb-5 rounded-xl px-4 py-3 flex items-center gap-3"
          [ngClass]="g.result.verificationOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'">
          <span class="text-xl">{{ g.result.verificationOk ? '✅' : '❌' }}</span>
          <div>
            <p class="text-sm font-semibold" [ngClass]="g.result.verificationOk ? 'text-emerald-700' : 'text-red-700'">
              {{ g.result.verificationOk ? 'Verification passed' : 'Verification failed' }}
            </p>
            <p class="text-xs" [ngClass]="g.result.verificationOk ? 'text-emerald-500' : 'text-red-500'">
              Sum of all shares = {{ fmt(g.result.grandTotal) }}
            </p>
          </div>
        </div>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🏠</span>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rent</p>
            </div>
            <p class="text-xl font-bold text-gray-900">{{ fmt(g.result.totalRent) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Equal split</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🛒</span>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ration</p>
            </div>
            <p class="text-xl font-bold text-gray-900">{{ fmt(g.result.totalRation) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ g.expenses.splitMode === 'equal' ? 'Equal split' : 'Day-wise' }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🥦</span>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vegetable</p>
            </div>
            <p class="text-xl font-bold text-gray-900">{{ fmt(g.result.totalVegetable) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ g.expenses.splitMode === 'equal' ? 'Equal split' : 'Day-wise' }}</p>
          </div>
          <div class="bg-brand-500 rounded-xl shadow-sm p-4 col-span-2 lg:col-span-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">💰</span>
              <p class="text-xs font-semibold text-brand-200 uppercase tracking-wide">Grand Total</p>
            </div>
            <p class="text-2xl font-bold text-white">{{ fmt(g.result.grandTotal) }}</p>
            <p class="text-xs text-brand-200 mt-0.5">{{ g.members.length }} members</p>
          </div>
        </div>

        <!-- Breakdown Panel -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-bold text-gray-900 text-sm">Member Breakdown</h2>
            <span class="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
              {{ g.members.length }} members
            </span>
          </div>

          <!-- Desktop Table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50">
                  <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th *ngIf="isDaywise(g)" class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">📅 Days</th>
                  <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">🏠 Rent</th>
                  <th *ngIf="hasRationOrVeg(g)" class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">🛒🥦 Ration+Veg</th>
                  <th *ngIf="hasPersonalPaid(g)" class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">✅ Paid</th>
                  <th class="py-3.5 px-5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Pay Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let share of g.result.shares"
                  class="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                  <td class="py-4 px-5">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                        {{ share.memberName.slice(0,2).toUpperCase() }}
                      </div>
                      <span class="font-semibold text-gray-900">{{ share.memberName }}</span>
                    </div>
                  </td>
                  <td *ngIf="isDaywise(g)" class="py-4 px-4 text-center text-gray-700 text-xs font-semibold">
                    {{ share.daysPresent }}d
                  </td>
                  <td class="py-4 px-4 text-right text-gray-500 text-xs font-medium">{{ fmt(share.rentShare) }}</td>
                  <td *ngIf="hasRationOrVeg(g)" class="py-4 px-4 text-right text-gray-500 text-xs font-medium">
                    {{ share.rationVegShare > 0 ? fmt(share.rationVegShare) : '—' }}
                  </td>
                  <td *ngIf="hasPersonalPaid(g)" class="py-4 px-4 text-right text-xs font-medium text-emerald-600">
                    {{ share.personalExpensePaid > 0 ? '−' + fmt(share.personalExpensePaid) : '—' }}
                  </td>
                  <td class="py-4 px-5 text-right">
                    <div class="flex flex-col items-end">
                      <span class="font-bold text-lg" [ngClass]="share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">
                        {{ fmt(share.total) }}
                      </span>
                      <span class="text-xs mt-0.5" [ngClass]="share.total < 0 ? 'text-emerald-400' : 'text-gray-400'">
                        {{ share.total < 0 ? 'Gets back' : 'Pays' }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="md:hidden divide-y divide-gray-50">
            <div *ngFor="let share of g.result.shares" class="p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-xs font-bold text-brand-600">
                    {{ share.memberName.slice(0,2).toUpperCase() }}
                  </div>
                  <div>
                    <span class="font-bold text-gray-900">{{ share.memberName }}</span>
                    <span *ngIf="isDaywise(g)" class="ml-2 text-xs text-gray-400 font-medium">{{ share.daysPresent }}d</span>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-lg" [ngClass]="share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">
                    {{ fmt(share.total) }}
                  </p>
                  <p class="text-xs" [ngClass]="share.total < 0 ? 'text-emerald-400' : 'text-gray-400'">
                    {{ share.total < 0 ? 'Gets back' : 'Pays' }}
                  </p>
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div class="flex justify-between text-gray-500">
                  <span>🏠 Rent</span>
                  <span class="font-medium text-gray-700">{{ fmt(share.rentShare) }}</span>
                </div>
                <div *ngIf="share.rationVegShare > 0" class="flex justify-between text-gray-500">
                  <span>🛒🥦 Ration + Veggie</span>
                  <span class="font-medium text-gray-700">{{ fmt(share.rationVegShare) }}</span>
                </div>
                <div *ngIf="share.personalExpensePaid > 0" class="flex justify-between text-emerald-600">
                  <span>✅ Already Paid</span>
                  <span class="font-medium">−{{ fmt(share.personalExpensePaid) }}</span>
                </div>
                <div class="border-t border-gray-200 pt-1.5 flex justify-between font-semibold">
                  <span class="text-gray-600">Pay Amount</span>
                  <span [ngClass]="share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">{{ fmt(share.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GroupDetailComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private groupService = inject(GroupService);

  readonly fmt   = formatCurrency;
  readonly group = signal<Group | undefined>(undefined);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.group.set(this.groupService.getGroup(id));
  }

  isDaywise(g: Group): boolean { return g.expenses.splitMode === 'daywise'; }
  hasRationOrVeg(g: Group): boolean { return g.result.totalRation > 0 || g.result.totalVegetable > 0; }
  hasPersonalPaid(g: Group): boolean { return g.result.shares.some(s => s.personalExpensePaid > 0); }

  goBack(): void { this.router.navigate(['/']); }

  share(): void {
    const g = this.group();
    if (!g) return;

    const daywise = this.isDaywise(g);
    const hasRV = this.hasRationOrVeg(g);
    const hasPaid = this.hasPersonalPaid(g);

    // Column widths
    const col = (s: string, w: number) => s.padEnd(w).slice(0, w);

    // Header row
    let header = col('Member', 14);
    if (daywise) header += col('Days', 6);
    header += col('Rent', 10);
    if (hasRV) header += col('Ration+Veg', 12);
    if (hasPaid) header += col('Paid', 10);
    header += 'Pay Amount';

    const divider = '-'.repeat(header.length);

    // Data rows
    const rows = g.result.shares.map(s => {
      let row = col(s.memberName, 14);
      if (daywise) row += col(`${s.daysPresent}d`, 6);
      row += col(`₹${s.rentShare.toFixed(2)}`, 10);
      if (hasRV) row += col(s.rationVegShare > 0 ? `₹${s.rationVegShare.toFixed(2)}` : '—', 12);
      if (hasPaid) row += col(s.personalExpensePaid > 0 ? `-₹${s.personalExpensePaid.toFixed(2)}` : '—', 10);
      row += (s.total < 0 ? `Gets ₹${Math.abs(s.total).toFixed(2)}` : `₹${s.total.toFixed(2)}`);
      return row;
    });

    const lines = [
      `*Split Karo – ${g.name}*`,
      `Period: ${g.cycleLabel}`,
      `Split: ${daywise ? 'Day-wise' : 'Equal'}`,
      ``,
      `Expenses:`,
      `  Room Rent:  ₹${g.result.totalRent}`,
      `  Ration:     ₹${g.result.totalRation}`,
      `  Vegetable:  ₹${g.result.totalVegetable}`,
      `  Total:      ₹${g.result.grandTotal}`,
      ``,
      `Breakdown:`,
      header,
      divider,
      ...rows,
      divider,
      ``,
      g.result.verificationOk
        ? `✅ Verification passed — sum of all shares = ₹${g.result.grandTotal}`
        : `❌ Verification failed`,
      ``,
      `Generated by Split Karo`,
    ];

    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    }
  }
}
