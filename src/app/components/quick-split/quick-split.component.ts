import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { calculateSettlements } from '../../utils/trip-calculator';
import { Trip, TripMember, TripExpense } from '../../models/trip.model';

type Mode = 'equal' | 'one-paid' | 'custom';

@Component({
  selector: 'app-quick-split',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" (click)="close.emit()"></div>

    <!-- Bottom Sheet -->
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col"
      style="max-height:92vh; animation: sheetUp 0.28s cubic-bezier(.32,.72,0,1)">

      <!-- Handle -->
      <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div class="w-10 h-1 bg-gray-200 rounded-full"></div>
      </div>

      <!-- Header -->
      <div class="px-5 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-100">
        <div>
          <h2 class="font-bold text-gray-900 text-lg">⚡ Quick Split</h2>
          <p class="text-xs text-gray-400 mt-0.5">No saving · instant result</p>
        </div>
        <button (click)="close.emit()"
          class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-lg leading-none">
          ×
        </button>
      </div>

      <!-- Scrollable body -->
      <div class="overflow-y-auto flex-1 px-5 py-4 space-y-5">

        <!-- Amount -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Total Bill Amount</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₹</span>
            <input [(ngModel)]="totalAmount" type="number" min="0" placeholder="0"
              class="w-full border-2 border-gray-200 focus:border-brand-400 rounded-2xl pl-10 pr-4 py-3.5 text-2xl font-bold text-gray-900 focus:outline-none transition-colors" />
          </div>
        </div>

        <!-- Mode selector -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to split?</label>
          <div class="grid grid-cols-3 gap-2">
            <button *ngFor="let m of modes" (click)="mode.set(m.key)"
              class="flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-semibold transition-colors"
              [ngClass]="mode() === m.key
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'">
              <span class="text-xl">{{ m.icon }}</span>
              <span>{{ m.label }}</span>
              <span class="text-[10px] font-normal text-center leading-tight opacity-70">{{ m.hint }}</span>
            </button>
          </div>
        </div>

        <!-- ═══ EQUAL MODE ═══ -->
        <div *ngIf="mode() === 'equal'" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Number of People</label>
            <div class="flex items-center gap-4">
              <button (click)="changeCount(-1)"
                class="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold transition-colors flex items-center justify-center">−</button>
              <span class="text-3xl font-bold text-gray-900 w-12 text-center">{{ peopleCount }}</span>
              <button (click)="changeCount(1)"
                class="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold transition-colors flex items-center justify-center">+</button>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Names (optional)</label>
              <span class="text-xs text-gray-400">for share message</span>
            </div>
            <div class="space-y-2">
              <div *ngFor="let p of equalPeople; let i = index" class="flex items-center gap-2">
                <div class="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">{{ i + 1 }}</div>
                <input [(ngModel)]="p.name" type="text" [placeholder]="'Person ' + (i+1)"
                  class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </div>

          <div *ngIf="+totalAmount > 0"
            class="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
            <p class="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-1">Each Person Pays</p>
            <p class="text-4xl font-bold text-brand-600">₹{{ equalShare | number:'1.0-2' }}</p>
            <p class="text-xs text-brand-400 mt-1">₹{{ totalAmount }} ÷ {{ peopleCount }} people</p>
          </div>
        </div>

        <!-- ═══ ONE PAID MODE ═══ -->
        <div *ngIf="mode() === 'one-paid'" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Who Paid the Bill?</label>
            <input [(ngModel)]="paidByName" type="text" placeholder="e.g. Prasanta"
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Others in the bill</label>
              <button (click)="addOnePaidPerson()" class="text-xs font-semibold text-brand-500 hover:text-brand-700">+ Add</button>
            </div>
            <div class="space-y-2">
              <div *ngFor="let p of onePaidPeople; let i = index" class="flex items-center gap-2">
                <input [(ngModel)]="p.name" type="text" [placeholder]="'Person ' + (i+1)"
                  class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <button (click)="removeOnePaidPerson(i)" *ngIf="onePaidPeople.length > 1"
                  class="text-gray-300 hover:text-rose-400 transition-colors text-xl leading-none">×</button>
              </div>
            </div>
          </div>

          <!-- Result -->
          <div *ngIf="+totalAmount > 0 && paidByName.trim()"
            class="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
            <p class="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">
              Each of {{ onePaidPeople.length + 1 }} people owes
            </p>
            <div class="text-center mb-2">
              <span class="text-3xl font-bold text-indigo-600">₹{{ onePaidShare | number:'1.0-2' }}</span>
            </div>
            <div class="border-t border-indigo-100 pt-2 space-y-1.5">
              <div *ngFor="let p of onePaidPeople" class="flex items-center justify-between text-sm">
                <span class="text-gray-700 font-medium">{{ p.name || 'Person' }}</span>
                <span class="font-bold text-indigo-600">
                  → pays <span class="text-brand-600">{{ paidByName }}</span> ₹{{ onePaidShare | number:'1.0-2' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm text-emerald-600">
                <span class="font-medium">{{ paidByName }} (paid)</span>
                <span class="font-bold">keeps ₹{{ onePaidShare | number:'1.0-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ CUSTOM MODE ═══ -->
        <div *ngIf="mode() === 'custom'" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Each person's share</label>
              <button (click)="addCustomPerson()" class="text-xs font-semibold text-brand-500 hover:text-brand-700">+ Add Person</button>
            </div>
            <div class="space-y-2">
              <div *ngFor="let p of customPeople; let i = index" class="flex items-center gap-2">
                <input [(ngModel)]="p.name" type="text" [placeholder]="'Person ' + (i+1)"
                  class="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div class="relative w-28">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input [(ngModel)]="p.amount" type="number" min="0" placeholder="0"
                    class="w-full border border-gray-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <button (click)="removeCustomPerson(i)" *ngIf="customPeople.length > 2"
                  class="text-gray-300 hover:text-rose-400 transition-colors text-xl leading-none">×</button>
              </div>
            </div>
          </div>

          <!-- Running total -->
          <div class="rounded-xl p-3 flex items-center justify-between text-sm"
            [ngClass]="customBalanced ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'">
            <span class="font-medium" [ngClass]="customBalanced ? 'text-emerald-700' : 'text-amber-700'">
              {{ customBalanced ? '✓ Amounts match!' : 'Assigned so far' }}
            </span>
            <span class="font-bold" [ngClass]="customBalanced ? 'text-emerald-600' : 'text-amber-600'">
              ₹{{ customTotal | number:'1.0-2' }}
              <span *ngIf="!customBalanced && +totalAmount > 0" class="text-xs font-normal"> / ₹{{ totalAmount }}</span>
            </span>
          </div>

          <div *ngIf="!customBalanced && +totalAmount > 0"
            class="text-center text-xs text-amber-600 font-semibold">
            {{ customRemaining > 0
              ? '₹' + (customRemaining | number:'1.0-2') + ' still unassigned'
              : '₹' + ((-customRemaining) | number:'1.0-2') + ' over the total' }}
          </div>

          <!-- Who actually paid (for save as trip) -->
          <div *ngIf="customBalanced">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Who paid the full bill?</label>
            <div class="flex flex-wrap gap-1.5">
              <button *ngFor="let p of customPeople; let i = index"
                (click)="customPaidByIndex = i"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="customPaidByIndex === i
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-300'">
                {{ p.name || 'Person ' + (i+1) }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Action buttons -->
      <div class="flex-shrink-0 px-5 py-4 border-t border-gray-100 space-y-2">
        <button (click)="shareResult()" [disabled]="!canShare"
          class="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
          </svg>
          Share via WhatsApp / Copy
        </button>
        <button (click)="saveAsTrip()" [disabled]="!canSaveAsTrip"
          class="w-full bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          💾 Save as Trip (for tracking)
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes sheetUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
  `]
})
export class QuickSplitComponent {
  @Output() close = new EventEmitter<void>();
  private router      = inject(Router);
  private tripService = inject(TripService);

  readonly modes = [
    { key: 'equal'    as Mode, icon: '⚖️', label: 'Equal',    hint: 'Everyone pays same' },
    { key: 'one-paid' as Mode, icon: '💳', label: 'One Paid', hint: 'One person paid bill' },
    { key: 'custom'   as Mode, icon: '✏️', label: 'Custom',   hint: 'Different amounts' },
  ];

  readonly mode = signal<Mode>('equal');

  // Plain properties — Angular zone.js change detection re-evaluates getters on every event
  totalAmount: number | '' = '';

  // Equal mode
  peopleCount = 2;
  equalPeople: { name: string }[] = [{ name: '' }, { name: '' }];

  get equalShare(): number {
    return +this.totalAmount / this.peopleCount;
  }

  // One-paid mode
  paidByName = '';
  onePaidPeople: { name: string }[] = [{ name: '' }, { name: '' }];

  get onePaidShare(): number {
    // total / (others + payer) — everyone including payer shares equally
    return +this.totalAmount / (this.onePaidPeople.length + 1);
  }

  // Custom mode
  customPeople: { name: string; amount: number | '' }[] = [
    { name: '', amount: '' },
    { name: '', amount: '' },
  ];
  customPaidByIndex = 0;

  get customTotal(): number {
    return this.customPeople.reduce((s, p) => s + (+p.amount || 0), 0);
  }

  get customRemaining(): number {
    return (+this.totalAmount || 0) - this.customTotal;
  }

  get customBalanced(): boolean {
    return +this.totalAmount > 0 && Math.abs(this.customRemaining) < 0.01;
  }

  // Validation
  get canShare(): boolean {
    if (!+this.totalAmount || +this.totalAmount <= 0) return false;
    if (this.mode() === 'equal')    return this.peopleCount >= 2;
    if (this.mode() === 'one-paid') return !!this.paidByName.trim() && this.onePaidPeople.length >= 1;
    if (this.mode() === 'custom')   return this.customBalanced;
    return false;
  }

  get canSaveAsTrip(): boolean {
    if (!this.canShare) return false;
    if (this.mode() === 'custom') return this.customBalanced && this.customPaidByIndex >= 0;
    return true;
  }

  // Equal helpers
  changeCount(delta: number): void {
    const next = Math.max(2, this.peopleCount + delta);
    this.peopleCount = next;
    while (this.equalPeople.length < next) this.equalPeople.push({ name: '' });
    this.equalPeople = this.equalPeople.slice(0, next);
  }

  // One-paid helpers
  addOnePaidPerson(): void    { this.onePaidPeople = [...this.onePaidPeople, { name: '' }]; }
  removeOnePaidPerson(i: number): void { this.onePaidPeople = this.onePaidPeople.filter((_, idx) => idx !== i); }

  // Custom helpers
  addCustomPerson(): void    { this.customPeople = [...this.customPeople, { name: '', amount: '' }]; }
  removeCustomPerson(i: number): void {
    this.customPeople = this.customPeople.filter((_, idx) => idx !== i);
    if (this.customPaidByIndex >= this.customPeople.length) this.customPaidByIndex = 0;
  }

  shareResult(): void {
    const text = this.buildShareText();
    if (navigator.share) {
      navigator.share({ text });
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      Object.assign(ta.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Copied to clipboard!');
    }
  }

  private buildShareText(): string {
    const amt = +this.totalAmount;
    const lines: string[] = ['⚡ *Quick Split — Split Karo*', ''];

    if (this.mode() === 'equal') {
      const share = this.equalShare;
      lines.push(`💰 Total: ₹${amt}`);
      lines.push(`👥 Split among ${this.peopleCount} people`);
      lines.push(`📌 Each pays: ₹${share.toFixed(2)}`);
      const named = this.equalPeople.filter(p => p.name.trim());
      if (named.length > 0) {
        lines.push('');
        named.forEach(p => lines.push(`  • ${p.name} → ₹${share.toFixed(2)}`));
      }
    } else if (this.mode() === 'one-paid') {
      const share = this.onePaidShare;
      lines.push(`💰 Total: ₹${amt}`);
      lines.push(`💳 Paid by: ${this.paidByName}`);
      lines.push(`📌 Each person's share: ₹${share.toFixed(2)}`);
      lines.push('');
      this.onePaidPeople.forEach(p =>
        lines.push(`  • ${p.name || 'Person'} → pay ${this.paidByName} ₹${share.toFixed(2)}`),
      );
      lines.push(`  • ${this.paidByName} → keeps ₹${share.toFixed(2)}`);
    } else {
      const payer = this.customPeople[this.customPaidByIndex];
      lines.push(`💰 Total: ₹${amt}`);
      lines.push(`💳 Paid by: ${payer?.name || 'Payer'}`);
      lines.push('');
      this.customPeople.forEach((p, i) => {
        if (i === this.customPaidByIndex) {
          lines.push(`  • ${p.name || 'Payer'} → keeps ₹${(+p.amount || 0).toFixed(2)}`);
        } else {
          lines.push(`  • ${p.name || 'Person'} → pay ${payer?.name || 'Payer'} ₹${(+p.amount || 0).toFixed(2)}`);
        }
      });
    }

    lines.push('', '_via Split Karo app_');
    return lines.join('\n');
  }

  async saveAsTrip(): Promise<void> {
    const amt = +this.totalAmount;
    let members: TripMember[];
    let expenses: TripExpense[];

    if (this.mode() === 'equal') {
      members = this.equalPeople.map((p, i) => ({
        id: crypto.randomUUID(),
        name: p.name.trim() || `Person ${i + 1}`,
      }));
      expenses = [{
        id: crypto.randomUUID(),
        description: 'Bill',
        amount: amt,
        paidBy: members[0].id,
        splitAmong: members.map(m => m.id),
      }];

    } else if (this.mode() === 'one-paid') {
      const payer: TripMember = { id: crypto.randomUUID(), name: this.paidByName.trim() || 'Payer' };
      const others: TripMember[] = this.onePaidPeople.map((p, i) => ({
        id: crypto.randomUUID(),
        name: p.name.trim() || `Person ${i + 1}`,
      }));
      members = [payer, ...others];
      expenses = [{
        id: crypto.randomUUID(),
        description: 'Bill',
        amount: amt,
        paidBy: payer.id,
        splitAmong: members.map(m => m.id),
      }];

    } else {
      // Custom: payer paid full bill, create one expense per non-payer (their specific amount)
      // so settlement shows each person owes payer their exact custom amount
      members = this.customPeople.map((p, i) => ({
        id: crypto.randomUUID(),
        name: p.name.trim() || `Person ${i + 1}`,
      }));
      const payerMember = members[this.customPaidByIndex];
      expenses = this.customPeople
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i !== this.customPaidByIndex)
        .map(({ p, i }) => ({
          id: crypto.randomUUID(),
          description: `${members[i].name}'s share`,
          amount: +p.amount || 0,
          paidBy: payerMember.id,
          splitAmong: [members[i].id],
        }));
      // Add payer's own share as expense paid by and split to themselves
      const payerAmount = +(this.customPeople[this.customPaidByIndex].amount) || 0;
      if (payerAmount > 0) {
        expenses.push({
          id: crypto.randomUUID(),
          description: `${payerMember.name}'s share`,
          amount: payerAmount,
          paidBy: payerMember.id,
          splitAmong: [payerMember.id],
        });
      }
    }

    const settlements = calculateSettlements(members, expenses);
    const trip: Trip = {
      id: crypto.randomUUID(),
      name: `Quick Split ₹${amt}`,
      createdAt: new Date().toISOString(),
      members,
      expenses,
      settlements,
    };
    await this.tripService.addTrip(trip);
    this.close.emit();
    this.router.navigate(['/trip', trip.id]);
  }
}
