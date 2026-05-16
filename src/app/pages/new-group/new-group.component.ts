import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupFormService } from '../../services/group-form.service';
import { GroupService } from '../../services/group.service';
import { calculateShares } from '../../utils/calculator';
import { nanoid, formatCurrency } from '../../utils/formatters';
import { Member, ExpenseConfig } from '../../models/group.model';

@Component({
  selector: 'app-new-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
        <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="back()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 text-lg flex-shrink-0">
            ←
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-gray-900">New Group</h1>
            <p class="text-xs text-gray-400">Step {{ form().step }} of 4 — {{ steps[form().step - 1].label }}</p>
          </div>
        </div>
      </header>

      <!-- Step Indicator -->
      <div class="bg-white border-b border-gray-100">
        <div class="max-w-3xl mx-auto px-6 py-4 flex items-start">
          <ng-container *ngFor="let s of steps; let last = last">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                [ngClass]="stepCircleClass(s.n)">
                <ng-container *ngIf="form().step > s.n">✓</ng-container>
                <ng-container *ngIf="form().step <= s.n">{{ s.n }}</ng-container>
              </div>
              <span class="text-xs mt-1.5 font-medium whitespace-nowrap hidden sm:block transition-colors"
                [ngClass]="stepLabelClass(s.n)">{{ s.label }}</span>
            </div>
            <div *ngIf="!last" class="flex-1 h-0.5 mx-2 mt-4 rounded-full transition-colors"
              [ngClass]="stepLineClass(s.n)"></div>
          </ng-container>
        </div>
      </div>

      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-4 py-6 pb-28">

          <!-- ══ STEP 1: Group Info ══ -->
          <ng-container *ngIf="form().step === 1">
            <h2 class="text-lg font-bold text-gray-900 mb-1 anim-fade-up">Group Details</h2>
            <p class="text-sm text-gray-400 mb-6 anim-fade-up anim-d1">Name your group and set the billing period.</p>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 anim-fade-up anim-d2">
              <!-- Group Name -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Group Name *</label>
                <input type="text" inputmode="text"
                  [ngModel]="form().groupName"
                  (ngModelChange)="patchGroupName($event)"
                  placeholder="e.g. Room 5 – May 2026"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all" />
              </div>

              <!-- Billing Period: From → To -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Billing Period *</label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">From</label>
                    <input type="date"
                      [ngModel]="form().fromDate"
                      (ngModelChange)="patchFromDate($event)"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all text-gray-700" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">To</label>
                    <input type="date"
                      [ngModel]="form().toDate"
                      (ngModelChange)="patchToDate($event)"
                      [min]="form().fromDate"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all text-gray-700" />
                  </div>
                </div>
                <p *ngIf="cycleLabel()" class="text-xs text-brand-600 font-medium mt-2">
                  📅 {{ cycleLabel() }}
                </p>
              </div>
            </div>
          </ng-container>

          <!-- ══ STEP 2: Expenses ══ -->
          <ng-container *ngIf="form().step === 2">
            <h2 class="text-lg font-bold text-gray-900 mb-1 anim-fade-up">Expense Amounts</h2>
            <p class="text-sm text-gray-400 mb-6 anim-fade-up anim-d1">Enter totals and choose how each expense is divided.</p>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d2">
              <!-- Column headers (desktop) -->
              <div class="hidden sm:grid sm:grid-cols-[1fr_180px_220px] border-b border-gray-100 bg-gray-50 px-5 py-3 gap-4">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expense Type</span>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Amount (₹)</span>
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Split Mode</span>
              </div>

              <!-- Rent -->
              <div class="border-b border-gray-100 p-5">
                <div class="sm:grid sm:grid-cols-[1fr_180px_220px] sm:items-center sm:gap-4">
                  <div class="flex items-center gap-3 mb-3 sm:mb-0">
                    <div class="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏠</div>
                    <div>
                      <p class="font-semibold text-gray-800 text-sm">Room Rent</p>
                      <p class="text-xs text-gray-400">Split equally among all members</p>
                    </div>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden sm:ml-auto">
                    <span class="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.rentAmount"
                      (ngModelChange)="patchExpense('rentAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0" />
                  </div>
                  <div class="mt-3 sm:mt-0 sm:text-center">
                    <span class="inline-block text-xs bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full font-medium">Equal Only</span>
                  </div>
                </div>
              </div>

              <!-- Ration -->
              <div class="border-b border-gray-100 p-5">
                <div class="sm:grid sm:grid-cols-[1fr_180px_220px] sm:items-center sm:gap-4">
                  <div class="flex items-center gap-3 mb-3 sm:mb-0">
                    <div class="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🛒</div>
                    <div>
                      <p class="font-semibold text-gray-800 text-sm">Ration / Kiryana</p>
                      <p class="text-xs text-gray-400">Monthly grocery expenses</p>
                    </div>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden sm:ml-auto">
                    <span class="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.rationAmount"
                      (ngModelChange)="patchExpense('rationAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0" />
                  </div>
                  <div class="mt-3 sm:mt-0 flex gap-2 sm:justify-center">
                    <button (click)="patchExpense('rationSplitMode', 'equal')"
                      class="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      [ngClass]="form().expenses.rationSplitMode === 'equal'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">Equal</button>
                    <button (click)="patchExpense('rationSplitMode', 'daywise')"
                      class="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      [ngClass]="form().expenses.rationSplitMode === 'daywise'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">Day-wise</button>
                  </div>
                </div>
              </div>

              <!-- Vegetable -->
              <div class="p-5">
                <div class="sm:grid sm:grid-cols-[1fr_180px_220px] sm:items-center sm:gap-4">
                  <div class="flex items-center gap-3 mb-3 sm:mb-0">
                    <div class="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🥦</div>
                    <div>
                      <p class="font-semibold text-gray-800 text-sm">Vegetable</p>
                      <p class="text-xs text-gray-400">Fresh produce expenses</p>
                    </div>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden sm:ml-auto">
                    <span class="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.vegetableAmount"
                      (ngModelChange)="patchExpense('vegetableAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-3 py-2.5 text-sm focus:outline-none min-w-0" />
                  </div>
                  <div class="mt-3 sm:mt-0 flex gap-2 sm:justify-center">
                    <button (click)="patchExpense('vegetableSplitMode', 'equal')"
                      class="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      [ngClass]="form().expenses.vegetableSplitMode === 'equal'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">Equal</button>
                    <button (click)="patchExpense('vegetableSplitMode', 'daywise')"
                      class="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      [ngClass]="form().expenses.vegetableSplitMode === 'daywise'
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">Day-wise</button>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ══ STEP 3: Members ══ -->
          <ng-container *ngIf="form().step === 3">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-lg font-bold text-gray-900 anim-fade-up">Add Members</h2>
              <span class="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium anim-fade-up anim-d1">
                {{ form().members.length }} member{{ form().members.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <p class="text-sm text-gray-400 mb-6 anim-fade-up anim-d1">Add everyone sharing the expenses this cycle.</p>

            <!-- Empty state -->
            <div *ngIf="form().members.length === 0"
              class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-14 text-center mb-4 anim-scale-in">
              <div class="text-4xl mb-3">👥</div>
              <p class="font-semibold text-gray-600 text-sm">No members added yet</p>
              <p class="text-xs text-gray-400 mt-1">Click the button below to get started</p>
            </div>

            <!-- Member Table -->
            <div *ngIf="form().members.length > 0"
              class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 anim-fade-up anim-d2">
              <div class="overflow-x-auto">
                <table class="w-full text-sm" style="min-width: 460px">
                  <thead>
                    <tr class="border-b border-gray-100 bg-gray-50">
                      <th class="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th *ngIf="isDaywise()" class="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Days</th>
                      <th *ngIf="hasRation()" class="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Ration</th>
                      <th *ngIf="hasVegetable()" class="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Veggie</th>
                      <th class="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Paid (₹)</th>
                      <th class="py-3 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr *ngFor="let member of form().members; trackBy: trackMember" class="hover:bg-gray-50 transition-colors">
                      <td class="py-2.5 px-4">
                        <input type="text"
                          [ngModel]="member.name"
                          (ngModelChange)="updateMember(member.id, 'name', $event)"
                          placeholder="Member name"
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all" />
                      </td>
                      <td *ngIf="isDaywise()" class="py-2.5 px-3 text-center">
                        <input type="number" inputmode="decimal" min="0" max="31"
                          [ngModel]="member.daysPresent"
                          (ngModelChange)="updateMember(member.id, 'daysPresent', +$event)"
                          class="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent" />
                      </td>
                      <td *ngIf="hasRation()" class="py-2.5 px-3 text-center">
                        <input type="checkbox"
                          [ngModel]="member.includeRation"
                          (ngModelChange)="updateMember(member.id, 'includeRation', $event)"
                          class="w-4 h-4 cursor-pointer rounded" />
                      </td>
                      <td *ngIf="hasVegetable()" class="py-2.5 px-3 text-center">
                        <input type="checkbox"
                          [ngModel]="member.includeVegetable"
                          (ngModelChange)="updateMember(member.id, 'includeVegetable', $event)"
                          class="w-4 h-4 cursor-pointer rounded" />
                      </td>
                      <td class="py-2.5 px-4">
                        <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <span class="px-2 py-2 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs">₹</span>
                          <input type="number" inputmode="decimal"
                            [ngModel]="member.personalExpensePaid"
                            (ngModelChange)="updateMember(member.id, 'personalExpensePaid', +$event)"
                            placeholder="0"
                            class="flex-1 px-2 py-2 text-sm focus:outline-none w-full min-w-0" />
                        </div>
                      </td>
                      <td class="py-2.5 px-3 text-center">
                        <button (click)="removeMember(member.id)"
                          class="text-gray-300 hover:text-rose-500 transition-colors p-1 rounded text-base leading-none">
                          ✕
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Add member CTA -->
            <button (click)="addMember()"
              class="w-full py-3 border-2 border-dashed border-brand-200 rounded-xl text-brand-500 font-semibold text-sm hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 anim-fade-up anim-d3">
              <span class="text-lg leading-none">+</span> Add Member
            </button>
          </ng-container>

          <!-- ══ STEP 4: Preview ══ -->
          <ng-container *ngIf="form().step === 4">
            <h2 class="text-lg font-bold text-gray-900 mb-1 anim-fade-up">Calculation Preview</h2>
            <p class="text-sm text-gray-400 mb-6 anim-fade-up anim-d1">{{ form().groupName }} · {{ cycleLabel() }}</p>

            <!-- Expense Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 anim-fade-up anim-d2">
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400 mb-1.5">🏠 Rent</p>
                <p class="font-bold text-gray-900">{{ fmt(result().totalRent) }}</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400 mb-1.5">🛒 Ration</p>
                <p class="font-bold text-gray-900">{{ fmt(result().totalRation) }}</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-xs text-gray-400 mb-1.5">🥦 Vegetable</p>
                <p class="font-bold text-gray-900">{{ fmt(result().totalVegetable) }}</p>
              </div>
              <div class="bg-brand-500 rounded-xl shadow-sm p-4 text-center col-span-2 sm:col-span-1">
                <p class="text-xs text-brand-200 mb-1.5">Grand Total</p>
                <p class="font-bold text-white">{{ fmt(result().grandTotal) }}</p>
              </div>
            </div>

            <!-- Breakdown Table -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d3">
              <div class="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Breakdown</h3>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm" style="min-width: 460px">
                  <thead>
                    <tr class="border-b border-gray-100">
                      <th class="py-3 px-5 text-left text-xs font-semibold text-gray-500">Member</th>
                      <th class="py-3 px-4 text-right text-xs font-semibold text-gray-500">Rent</th>
                      <th *ngIf="result().totalRation > 0" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">Ration</th>
                      <th *ngIf="result().totalVegetable > 0" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">Veggie</th>
                      <th *ngIf="hasAnyPersonalPaid()" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">Paid</th>
                      <th class="py-3 px-5 text-right text-xs font-semibold text-gray-700">Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let share of result().shares" class="border-b border-gray-50 last:border-b-0 hover:bg-gray-50">
                      <td class="py-3.5 px-5 font-semibold text-gray-900">{{ share.memberName }}</td>
                      <td class="py-3.5 px-4 text-right text-gray-500 text-xs">{{ fmt(share.rentShare) }}</td>
                      <td *ngIf="result().totalRation > 0" class="py-3.5 px-4 text-right text-gray-500 text-xs">
                        {{ share.rationShare > 0 ? fmt(share.rationShare) : '—' }}
                      </td>
                      <td *ngIf="result().totalVegetable > 0" class="py-3.5 px-4 text-right text-gray-500 text-xs">
                        {{ share.vegetableShare > 0 ? fmt(share.vegetableShare) : '—' }}
                      </td>
                      <td *ngIf="hasAnyPersonalPaid()" class="py-3.5 px-4 text-right text-xs text-emerald-600 font-medium">
                        {{ share.personalExpensePaid > 0 ? '−' + fmt(share.personalExpensePaid) : '—' }}
                      </td>
                      <td class="py-3.5 px-5 text-right">
                        <div class="flex flex-col items-end">
                          <span class="font-bold" [ngClass]="share.total < 0 ? 'text-emerald-600' : 'text-brand-600'">
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
            </div>
          </ng-container>

        </div>
      </div>

      <!-- Bottom Action Bar -->
      <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-20">
        <div class="max-w-3xl mx-auto px-4 py-4 flex gap-3">
          <button *ngIf="form().step > 1" (click)="prevStep()"
            class="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex-shrink-0">
            ← Back
          </button>
          <button *ngIf="form().step < 4" (click)="nextStep()"
            class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm shadow-sm transition-colors">
            Continue →
          </button>
          <button *ngIf="form().step === 4" (click)="saveGroup()"
            class="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-sm transition-colors">
            ✓ Save Group
          </button>
        </div>
      </div>

    </div>
  `
})
export class NewGroupComponent {
  private router = inject(Router);
  private formService = inject(GroupFormService);
  private groupService = inject(GroupService);

  readonly form = this.formService.form;
  readonly fmt = formatCurrency;

  readonly steps = [
    { n: 1, label: 'Info' },
    { n: 2, label: 'Expenses' },
    { n: 3, label: 'Members' },
    { n: 4, label: 'Preview' },
  ];

  readonly result = computed(() => calculateShares(this.form().expenses, this.form().members));

  readonly cycleLabel = computed(() => {
    const { fromDate, toDate } = this.form();
    if (!fromDate || !toDate) return '';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const f = new Date(fromDate + 'T00:00:00');
    const t = new Date(toDate + 'T00:00:00');
    return `${f.toLocaleDateString('en-IN', opts)} – ${t.toLocaleDateString('en-IN', opts)}`;
  });

  stepCircleClass(n: number): string {
    const s = this.form().step;
    if (s > n) return 'bg-brand-500 text-white';
    if (s === n) return 'bg-brand-500 text-white ring-4 ring-brand-100';
    return 'bg-gray-100 text-gray-400';
  }

  stepLabelClass(n: number): string {
    return this.form().step === n ? 'text-brand-600' : 'text-gray-400';
  }

  stepLineClass(n: number): string {
    return this.form().step > n ? 'bg-brand-400' : 'bg-gray-200';
  }

  back(): void {
    if (this.form().step === 1) this.router.navigate(['/']);
    else this.prevStep();
  }

  prevStep(): void {
    const s = this.form().step;
    if (s > 1) this.formService.setStep((s - 1) as 1 | 2 | 3 | 4);
  }

  nextStep(): void {
    const f = this.form();
    if (f.step === 1) {
      if (!f.groupName.trim()) { alert('Please enter a Group Name'); return; }
      if (!f.fromDate || !f.toDate) { alert('Please select both From and To dates'); return; }
      if (f.toDate < f.fromDate) { alert('End date must be after start date'); return; }
    }
    if (f.step === 3 && f.members.length === 0) { alert('Please add at least one member'); return; }
    if (f.step === 3) {
      const invalid = f.members.find(m => !m.name.trim());
      if (invalid) { alert('Please fill all member names'); return; }
    }
    if (f.step < 4) this.formService.setStep((f.step + 1) as 2 | 3 | 4);
  }

  saveGroup(): void {
    const f = this.form();
    const result = calculateShares(f.expenses, f.members);
    this.groupService.addGroup({
      id: nanoid(),
      name: f.groupName,
      cycleLabel: this.cycleLabel(),
      createdAt: new Date().toISOString(),
      expenses: f.expenses,
      members: f.members,
      result,
    });
    this.formService.reset();
    this.router.navigate(['/']);
  }

  patchGroupName(value: string): void {
    this.formService.setGroupInfo(value, this.form().fromDate, this.form().toDate);
  }

  patchFromDate(value: string): void {
    this.formService.setGroupInfo(this.form().groupName, value, this.form().toDate);
  }

  patchToDate(value: string): void {
    this.formService.setGroupInfo(this.form().groupName, this.form().fromDate, value);
  }

  patchExpense(key: keyof ExpenseConfig, value: any): void {
    this.formService.setExpenses({ ...this.form().expenses, [key]: value });
  }

  addMember(): void { this.formService.addMember(); }

  updateMember(id: string, key: keyof Member, value: any): void {
    this.formService.updateMember(id, { [key]: value });
  }

  removeMember(id: string): void { this.formService.removeMember(id); }

  isDaywise(): boolean {
    const e = this.form().expenses;
    return e.rationSplitMode === 'daywise' || e.vegetableSplitMode === 'daywise';
  }

  hasRation(): boolean { return this.form().expenses.rationAmount > 0; }
  hasVegetable(): boolean { return this.form().expenses.vegetableAmount > 0; }
  hasAnyPersonalPaid(): boolean { return this.form().members.some(m => m.personalExpensePaid > 0); }

  trackMember(_: number, member: Member): string { return member.id; }
}
