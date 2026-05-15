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
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      <div class="bg-brand-500 text-white px-4 py-4 shadow-md flex items-center gap-3">
        <button (click)="back()" class="text-white text-xl font-bold">←</button>
        <div>
          <h1 class="text-lg font-bold">New Group</h1>
          <p class="text-brand-100 text-xs">Step {{ form().step }} of 4</p>
        </div>
      </div>

      <!-- Step Indicator -->
      <div class="flex gap-2 px-4 pt-4">
        <div *ngFor="let s of [1,2,3,4]"
          class="h-1.5 flex-1 rounded-full transition-colors"
          [class.bg-brand-500]="form().step >= s"
          [class.bg-gray-200]="form().step < s">
        </div>
      </div>

      <!-- Steps -->
      <div class="flex-1 overflow-y-auto px-4 pt-6 pb-32 max-w-2xl mx-auto w-full">

        <!-- STEP 1: Group Info -->
        <ng-container *ngIf="form().step === 1">
          <h2 class="text-xl font-bold text-gray-800 mb-6">Group Details</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
              <input type="text" inputmode="text"
                [ngModel]="form().groupName"
                (ngModelChange)="patchGroupName($event)"
                placeholder="e.g. Room 5 - May 2026"
                class="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Cycle Period *</label>
              <input type="text" inputmode="text"
                [ngModel]="form().cycleLabel"
                (ngModelChange)="patchCycleLabel($event)"
                placeholder="e.g. 1 May – 15 May 2026"
                class="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white" />
            </div>
          </div>
        </ng-container>

        <!-- STEP 2: Expenses -->
        <ng-container *ngIf="form().step === 2">
          <h2 class="text-xl font-bold text-gray-800 mb-6">Expense Amounts</h2>

          <div class="space-y-5">
            <!-- Room Rent -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🏠</span>
                <span class="font-semibold text-gray-700">Room Rent</span>
                <span class="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Always Equal</span>
              </div>
              <div class="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                <span class="px-3 text-gray-500 bg-gray-50 border-r border-gray-300 py-3">₹</span>
                <input type="number" inputmode="decimal"
                  [ngModel]="form().expenses.rentAmount"
                  (ngModelChange)="patchExpense('rentAmount', +$event)"
                  placeholder="0"
                  class="flex-1 px-3 py-3 text-base focus:outline-none" />
              </div>
            </div>

            <!-- Ration -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🛒</span>
                <span class="font-semibold text-gray-700">Ration / Kiryana</span>
              </div>
              <div class="flex items-center border border-gray-300 rounded-xl overflow-hidden mb-3">
                <span class="px-3 text-gray-500 bg-gray-50 border-r border-gray-300 py-3">₹</span>
                <input type="number" inputmode="decimal"
                  [ngModel]="form().expenses.rationAmount"
                  (ngModelChange)="patchExpense('rationAmount', +$event)"
                  placeholder="0"
                  class="flex-1 px-3 py-3 text-base focus:outline-none" />
              </div>
              <div class="flex gap-2">
                <button (click)="patchExpense('rationSplitMode', 'equal')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class.bg-brand-500]="form().expenses.rationSplitMode === 'equal'"
                  [class.text-white]="form().expenses.rationSplitMode === 'equal'"
                  [class.bg-gray-100]="form().expenses.rationSplitMode !== 'equal'"
                  [class.text-gray-600]="form().expenses.rationSplitMode !== 'equal'">
                  Equal Split
                </button>
                <button (click)="patchExpense('rationSplitMode', 'daywise')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class.bg-brand-500]="form().expenses.rationSplitMode === 'daywise'"
                  [class.text-white]="form().expenses.rationSplitMode === 'daywise'"
                  [class.bg-gray-100]="form().expenses.rationSplitMode !== 'daywise'"
                  [class.text-gray-600]="form().expenses.rationSplitMode !== 'daywise'">
                  Day-wise
                </button>
              </div>
            </div>

            <!-- Vegetable -->
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🥦</span>
                <span class="font-semibold text-gray-700">Vegetable</span>
              </div>
              <div class="flex items-center border border-gray-300 rounded-xl overflow-hidden mb-3">
                <span class="px-3 text-gray-500 bg-gray-50 border-r border-gray-300 py-3">₹</span>
                <input type="number" inputmode="decimal"
                  [ngModel]="form().expenses.vegetableAmount"
                  (ngModelChange)="patchExpense('vegetableAmount', +$event)"
                  placeholder="0"
                  class="flex-1 px-3 py-3 text-base focus:outline-none" />
              </div>
              <div class="flex gap-2">
                <button (click)="patchExpense('vegetableSplitMode', 'equal')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class.bg-brand-500]="form().expenses.vegetableSplitMode === 'equal'"
                  [class.text-white]="form().expenses.vegetableSplitMode === 'equal'"
                  [class.bg-gray-100]="form().expenses.vegetableSplitMode !== 'equal'"
                  [class.text-gray-600]="form().expenses.vegetableSplitMode !== 'equal'">
                  Equal Split
                </button>
                <button (click)="patchExpense('vegetableSplitMode', 'daywise')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                  [class.bg-brand-500]="form().expenses.vegetableSplitMode === 'daywise'"
                  [class.text-white]="form().expenses.vegetableSplitMode === 'daywise'"
                  [class.bg-gray-100]="form().expenses.vegetableSplitMode !== 'daywise'"
                  [class.text-gray-600]="form().expenses.vegetableSplitMode !== 'daywise'">
                  Day-wise
                </button>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- STEP 3: Members -->
        <ng-container *ngIf="form().step === 3">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-gray-800">Add Members</h2>
            <button (click)="addMember()"
              class="bg-brand-500 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow">
              + Add
            </button>
          </div>

          <div *ngIf="form().members.length === 0" class="text-center py-12 text-gray-400">
            <div class="text-4xl mb-2">👥</div>
            <p>No members yet. Tap + Add</p>
          </div>

          <div class="space-y-4">
            <div *ngFor="let member of form().members; let i = index"
              class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <!-- Name + Delete -->
              <div class="flex gap-2 items-start mb-3">
                <div class="flex-1">
                  <label class="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                  <input type="text"
                    [ngModel]="member.name"
                    (ngModelChange)="updateMember(member.id, 'name', $event)"
                    placeholder="Member name"
                    class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <button (click)="removeMember(member.id)"
                  class="mt-5 text-red-400 hover:text-red-600 px-2 text-xl">✕</button>
              </div>

              <!-- Days (shown if any daywise mode) -->
              <div *ngIf="isDaywise()" class="mb-3">
                <label class="text-xs font-medium text-gray-500 mb-1 block">Days Present (out of 15)</label>
                <input type="number" inputmode="decimal" min="0" max="15"
                  [ngModel]="member.daysPresent"
                  (ngModelChange)="updateMember(member.id, 'daysPresent', +$event)"
                  class="w-24 border border-gray-300 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <!-- Ration checkbox -->
              <div *ngIf="form().expenses.rationAmount > 0" class="flex items-center gap-2 mb-2">
                <input type="checkbox" [id]="'ration-' + member.id"
                  [ngModel]="member.includeRation"
                  (ngModelChange)="updateMember(member.id, 'includeRation', $event)"
                  class="w-4 h-4 accent-orange-500" />
                <label [for]="'ration-' + member.id" class="text-sm text-gray-600">Include in Ration</label>
              </div>

              <!-- Vegetable checkbox -->
              <div *ngIf="form().expenses.vegetableAmount > 0" class="flex items-center gap-2 mb-2">
                <input type="checkbox" [id]="'veg-' + member.id"
                  [ngModel]="member.includeVegetable"
                  (ngModelChange)="updateMember(member.id, 'includeVegetable', $event)"
                  class="w-4 h-4 accent-orange-500" />
                <label [for]="'veg-' + member.id" class="text-sm text-gray-600">Include in Vegetable</label>
              </div>

              <!-- Personal Expense Paid -->
              <div class="mt-2">
                <label class="text-xs font-medium text-gray-500 mb-1 block">Personal Expense Paid by them (₹)</label>
                <div class="flex items-center border border-gray-300 rounded-xl overflow-hidden w-40">
                  <span class="px-2 text-gray-500 bg-gray-50 border-r border-gray-300 py-2.5">₹</span>
                  <input type="number" inputmode="decimal"
                    [ngModel]="member.personalExpensePaid"
                    (ngModelChange)="updateMember(member.id, 'personalExpensePaid', +$event)"
                    placeholder="0"
                    class="flex-1 px-2 py-2.5 text-base focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- STEP 4: Preview -->
        <ng-container *ngIf="form().step === 4">
          <h2 class="text-xl font-bold text-gray-800 mb-2">Calculation Preview</h2>
          <p class="text-gray-400 text-sm mb-6">{{ form().groupName }} · {{ form().cycleLabel }}</p>

          <!-- Summary Banner -->
          <div class="bg-brand-500 text-white rounded-2xl p-4 mb-6 shadow">
            <div class="grid grid-cols-3 gap-3 text-center text-sm mb-3">
              <div>
                <p class="text-brand-100 text-xs">Room Rent</p>
                <p class="font-bold">{{ fmt(result().totalRent) }}</p>
              </div>
              <div>
                <p class="text-brand-100 text-xs">Ration</p>
                <p class="font-bold">{{ fmt(result().totalRation) }}</p>
              </div>
              <div>
                <p class="text-brand-100 text-xs">Vegetable</p>
                <p class="font-bold">{{ fmt(result().totalVegetable) }}</p>
              </div>
            </div>
            <div class="border-t border-brand-400 pt-3 text-center">
              <p class="text-brand-100 text-xs">Grand Total</p>
              <p class="text-2xl font-bold">{{ fmt(result().grandTotal) }}</p>
            </div>
          </div>

          <!-- Per Person Cards -->
          <div class="space-y-3">
            <div *ngFor="let share of result().shares"
              class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-gray-800 text-lg">{{ share.memberName }}</h3>
                <span class="font-bold text-xl"
                  [class.text-brand-500]="share.total >= 0"
                  [class.text-green-600]="share.total < 0">
                  {{ share.total < 0 ? 'Gets back ' : 'Pays ' }}{{ fmt(share.total) }}
                </span>
              </div>
              <div class="text-sm text-gray-500 space-y-1">
                <div class="flex justify-between">
                  <span>🏠 Room Rent</span><span>{{ fmt(share.rentShare) }}</span>
                </div>
                <div *ngIf="share.rationShare > 0" class="flex justify-between">
                  <span>🛒 Ration</span><span>{{ fmt(share.rationShare) }}</span>
                </div>
                <div *ngIf="share.vegetableShare > 0" class="flex justify-between">
                  <span>🥦 Vegetable</span><span>{{ fmt(share.vegetableShare) }}</span>
                </div>
                <div *ngIf="share.personalExpensePaid > 0" class="flex justify-between text-green-600">
                  <span>✅ Already Paid</span><span>− {{ fmt(share.personalExpensePaid) }}</span>
                </div>
                <div class="border-t border-gray-100 pt-1 flex justify-between font-semibold text-gray-700">
                  <span>Total</span>
                  <span [class.text-red-500]="share.total < 0">{{ fmt(share.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </ng-container>
      </div>

      <!-- Bottom Action Bar -->
      <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <div class="max-w-2xl mx-auto flex gap-3">
          <button *ngIf="form().step > 1" (click)="prevStep()"
            class="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-base transition-colors hover:bg-gray-50">
            ← Back
          </button>
          <button *ngIf="form().step < 4" (click)="nextStep()"
            class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base shadow transition-colors">
            Next →
          </button>
          <button *ngIf="form().step === 4" (click)="saveGroup()"
            class="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-base shadow transition-colors">
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

  readonly result = computed(() => {
    const f = this.form();
    return calculateShares(f.expenses, f.members);
  });

  back(): void {
    if (this.form().step === 1) {
      this.router.navigate(['/']);
    } else {
      this.prevStep();
    }
  }

  prevStep(): void {
    const s = this.form().step;
    if (s > 1) this.formService.setStep((s - 1) as 1 | 2 | 3 | 4);
  }

  nextStep(): void {
    const f = this.form();
    if (f.step === 1) {
      if (!f.groupName.trim() || !f.cycleLabel.trim()) {
        alert('Please fill Group Name and Cycle Period');
        return;
      }
    }
    if (f.step === 3 && f.members.length === 0) {
      alert('Please add at least one member');
      return;
    }
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
      cycleLabel: f.cycleLabel,
      createdAt: new Date().toISOString(),
      expenses: f.expenses,
      members: f.members,
      result,
    });
    this.formService.reset();
    this.router.navigate(['/']);
  }

  patchGroupName(value: string): void {
    this.formService.setGroupInfo(value, this.form().cycleLabel);
  }

  patchCycleLabel(value: string): void {
    this.formService.setGroupInfo(this.form().groupName, value);
  }

  patchExpense(key: keyof ExpenseConfig, value: any): void {
    this.formService.setExpenses({ ...this.form().expenses, [key]: value });
  }

  addMember(): void {
    this.formService.addMember();
  }

  updateMember(id: string, key: keyof Member, value: any): void {
    this.formService.updateMember(id, { [key]: value });
  }

  removeMember(id: string): void {
    this.formService.removeMember(id);
  }

  isDaywise(): boolean {
    const e = this.form().expenses;
    return e.rationSplitMode === 'daywise' || e.vegetableSplitMode === 'daywise';
  }
}
