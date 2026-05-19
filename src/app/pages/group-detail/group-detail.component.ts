import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { ImageShareService } from '../../services/image-share.service';
import { Group } from '../../models/group.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-white flex flex-col">

      <!-- ═══ NAVBAR ═══ -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <button (click)="goBack()"
              class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-brand-600 active:bg-brand-700 transition-colors">
              <span class="text-white font-bold text-sm tracking-tight">SK</span>
            </button>
            <span class="text-base font-bold text-gray-900">Split Karo</span>
          </div>
          <button (click)="shareImage()" [disabled]="isSharing()"
            class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5">
            <svg *ngIf="!isSharing()" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <svg *ngIf="isSharing()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            {{ isSharing() ? 'Generating…' : 'Share' }}
          </button>
        </div>
      </header>

      <!-- Not Found -->
      <div *ngIf="!group()" class="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div class="text-5xl mb-4">🔍</div>
        <h2 class="font-bold text-gray-700 text-lg">Group not found</h2>
        <button (click)="goBack()" class="mt-5 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm">← Go Back</button>
      </div>

      <!-- Content -->
      <ng-container *ngIf="group() as g">

        <!-- ═══ HERO HEADER ═══ -->
        <section class="bg-gradient-to-br from-white via-brand-50 to-indigo-50 border-b border-gray-100">
          <div class="max-w-6xl mx-auto px-4 sm:px-8 py-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div class="anim-fade-up">
                <!-- Back link -->
                <button (click)="goBack()" class="flex items-center gap-1.5 text-xs text-brand-600 font-semibold mb-3 hover:underline">
                  ← All Groups
                </button>
                <!-- Group avatar + title -->
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                    <span class="text-white font-bold text-lg tracking-tight">{{ g.name.slice(0,2).toUpperCase() }}</span>
                  </div>
                  <div>
                    <h1 class="text-2xl font-bold text-gray-900">{{ g.name }}</h1>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      <span class="text-sm text-gray-500">{{ g.cycleLabel }}</span>
                      <span class="text-gray-300">·</span>
                      <span class="text-sm text-gray-500">{{ g.members.length }} members</span>
                      <span class="text-gray-300">·</span>
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                        [ngClass]="g.expenses.splitMode === 'daywise' ? 'bg-indigo-100 text-indigo-700' : 'bg-brand-100 text-brand-700'">
                        {{ g.expenses.splitMode === 'daywise' ? '📅 Day-wise' : '⚖️ Equal split' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Verification pill -->
              <div class="anim-fade-up anim-d1 flex-shrink-0">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold"
                  [ngClass]="g.result.verificationOk
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'">
                  <span>{{ g.result.verificationOk ? '✅' : '❌' }}</span>
                  {{ g.result.verificationOk ? 'Verified' : 'Check failed' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══ DASHBOARD ═══ -->
        <div class="bg-slate-50 flex-1">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

            <!-- Stats Strip -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 anim-fade-up">
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">🏠 Rent</p>
                <p class="text-2xl font-bold text-gray-900">{{ fmt(g.result.totalRent) }}</p>
                <p class="text-xs text-gray-400 mt-0.5">Equal split</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">🛒 Ration</p>
                <p class="text-2xl font-bold text-gray-900">{{ fmt(g.result.totalRation) }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ g.expenses.splitMode === 'equal' ? 'Equal split' : 'Day-wise' }}</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">🥦 Vegetable</p>
                <p class="text-2xl font-bold text-gray-900">{{ fmt(g.result.totalVegetable) }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ g.expenses.splitMode === 'equal' ? 'Equal split' : 'Day-wise' }}</p>
              </div>
              <div class="bg-brand-500 rounded-xl shadow-sm p-4 col-span-2 lg:col-span-1">
                <p class="text-xs font-semibold text-brand-200 uppercase tracking-wide mb-1">💰 Grand Total</p>
                <p class="text-2xl font-bold text-white">{{ fmt(g.result.grandTotal) }}</p>
                <p class="text-xs text-brand-200 mt-0.5">{{ g.members.length }} members</p>
              </div>
            </div>

            <!-- Average Info Bar -->
            <div class="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 anim-fade-up anim-d1">
              <span class="text-xl flex-shrink-0">📊</span>
              <div *ngIf="g.expenses.splitMode === 'daywise'">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Daily Average (Ration + Veggie)</p>
                <p class="text-base font-bold text-brand-600 mt-0.5">
                  {{ fmt(dailyAvg(g)) }} <span class="text-xs font-normal text-gray-400">per day</span>
                </p>
              </div>
              <div *ngIf="g.expenses.splitMode === 'equal'">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Per Person Average</p>
                <p class="text-base font-bold text-brand-600 mt-0.5">
                  {{ fmt(perPersonAvg(g)) }} <span class="text-xs font-normal text-gray-400">per member</span>
                </p>
              </div>
            </div>

            <!-- ═══ BREAKDOWN PANEL ═══ -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d2">
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
                      <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th class="py-3.5 px-5 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Pay Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let share of g.result.shares"
                      class="border-b border-gray-50 last:border-b-0 hover:bg-brand-50 transition-colors group/row">
                      <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors"
                            [ngClass]="isPaid(share.memberId) && share.total > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'">
                            {{ isPaid(share.memberId) && share.total > 0 ? '✓' : share.memberName.slice(0,2).toUpperCase() }}
                          </div>
                          <span class="font-semibold text-gray-900 group-hover/row:text-brand-600 transition-colors">{{ share.memberName }}</span>
                        </div>
                      </td>
                      <td *ngIf="isDaywise(g)" class="py-4 px-4 text-center">
                        <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">{{ share.daysPresent }}</span>
                      </td>
                      <td class="py-4 px-4 text-right text-gray-500 text-xs font-medium">{{ fmt(share.rentShare) }}</td>
                      <td *ngIf="hasRationOrVeg(g)" class="py-4 px-4 text-right text-gray-500 text-xs font-medium">
                        {{ share.rationVegShare > 0 ? fmt(share.rationVegShare) : '—' }}
                      </td>
                      <td *ngIf="hasPersonalPaid(g)" class="py-4 px-4 text-right text-xs font-medium text-emerald-600">
                        {{ share.personalExpensePaid > 0 ? '−' + fmt(share.personalExpensePaid) : '—' }}
                      </td>
                      <td class="py-4 px-4 text-center">
                        <button *ngIf="share.total > 0"
                          (click)="togglePaid(share.memberId)"
                          [ngClass]="isPaid(share.memberId)
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'"
                          class="text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap">
                          {{ isPaid(share.memberId) ? '✓ Paid' : 'Mark Paid' }}
                        </button>
                        <span *ngIf="share.total <= 0" class="text-xs text-emerald-500 font-medium">Gets back</span>
                      </td>
                      <td class="py-4 px-5 text-right">
                        <div class="flex flex-col items-end">
                          <span class="font-bold text-lg"
                            [ngClass]="isPaid(share.memberId) && share.total > 0 ? 'text-emerald-500 line-through opacity-60' : share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">
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
                      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors"
                        [ngClass]="isPaid(share.memberId) && share.total > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'">
                        {{ isPaid(share.memberId) && share.total > 0 ? '✓' : share.memberName.slice(0,2).toUpperCase() }}
                      </div>
                      <div>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold text-gray-900">{{ share.memberName }}</span>
                          <span *ngIf="isDaywise(g)" class="text-xs text-gray-400 font-medium">{{ share.daysPresent }}d</span>
                          <span *ngIf="isPaid(share.memberId) && share.total > 0"
                            class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Paid</span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                      <p class="font-bold text-lg"
                        [ngClass]="isPaid(share.memberId) && share.total > 0 ? 'text-emerald-500 line-through opacity-60' : share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">
                        {{ fmt(share.total) }}
                      </p>
                      <p class="text-xs" [ngClass]="share.total < 0 ? 'text-emerald-400' : 'text-gray-400'">
                        {{ share.total < 0 ? 'Gets back' : 'Pays' }}
                      </p>
                      <button *ngIf="share.total > 0"
                        (click)="togglePaid(share.memberId)"
                        [ngClass]="isPaid(share.memberId)
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : 'bg-gray-100 text-gray-500 border-gray-200'"
                        class="text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors">
                        {{ isPaid(share.memberId) ? '✓ Paid' : 'Mark Paid' }}
                      </button>
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
      </ng-container>
    </div>
  `
})
export class GroupDetailComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private groupService = inject(GroupService);

  readonly fmt        = formatCurrency;
  readonly group      = signal<Group | undefined>(undefined);
  readonly isSharing  = signal(false);
  private imageShare  = inject(ImageShareService);
  private groupId     = '';

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.group.set(this.groupService.getGroup(this.groupId));
  }

  isDaywise(g: Group): boolean { return g.expenses.splitMode === 'daywise'; }
  hasRationOrVeg(g: Group): boolean { return g.result.totalRation > 0 || g.result.totalVegetable > 0; }
  hasPersonalPaid(g: Group): boolean { return g.result.shares.some(s => s.personalExpensePaid > 0); }

  dailyAvg(g: Group): number {
    const pool = g.result.totalRation + g.result.totalVegetable;
    const totalDays = g.members
      .filter(m => m.includeRationVeg)
      .reduce((s, m) => s + m.daysPresent, 0);
    return totalDays > 0 ? pool / totalDays : 0;
  }

  perPersonAvg(g: Group): number {
    return g.members.length > 0 ? g.result.grandTotal / g.members.length : 0;
  }

  isPaid(memberId: string): boolean {
    return !!(this.group()?.paidMembers?.[memberId]);
  }

  async togglePaid(memberId: string): Promise<void> {
    await this.groupService.toggleMemberPaid(this.groupId, memberId);
    this.group.set(this.groupService.getGroup(this.groupId));
  }

  goBack(): void { this.router.navigate(['/']); }

  async shareImage(): Promise<void> {
    const g = this.group();
    if (!g || this.isSharing()) return;
    this.isSharing.set(true);
    try {
      await this.imageShare.shareImage(g);
    } finally {
      this.isSharing.set(false);
    }
  }

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
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    } else {
      // Fallback for HTTP / older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Copied to clipboard!');
    }
  }
}
