import { Component, inject, computed, signal, effect, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { GroupFormService } from '../../services/group-form.service';
import { GroupService } from '../../services/group.service';
import { RosterService } from '../../services/roster.service';
import { UiService } from '../../services/ui.service';
import { calculateShares } from '../../utils/calculator';
import { nanoid, formatCurrency } from '../../utils/formatters';
import { Member, ExpenseConfig, SplitMode, ExtraItem } from '../../models/group.model';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-new-group',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- ─── Navbar ─── -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="back()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0">
            <app-icon name="arrow-left" class="w-5 h-5"></app-icon>
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-sm font-bold text-gray-900">New Split</h1>
            <p class="text-xs text-gray-400">Step {{ form().step }} of 4</p>
          </div>
          <!-- Mini step badge -->
          <span *ngIf="ready()" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
            [ngClass]="currentStep().badgeClass">
            {{ currentStep().icon }} {{ currentStep().label }}
          </span>
        </div>
      </header>

      <!-- Loading (waiting for roster from IndexedDB) -->
      <div *ngIf="!ready()" class="flex-1 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <!-- ─── Step Indicator + Progress ─── -->
      <div *ngIf="ready()" class="bg-white border-b border-gray-100 shadow-sm">
        <!-- Animated progress bar -->
        <div class="h-1 bg-gray-100">
          <div class="h-1 bg-brand-500 transition-all duration-500 ease-out rounded-r-full"
            [style.width]="stepProgress() + '%'"></div>
        </div>
        <!-- Step circles -->
        <div class="max-w-3xl mx-auto px-5 py-4 flex items-start">
          <ng-container *ngFor="let s of steps; let last = last">
            <div class="flex flex-col items-center cursor-default">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                [ngClass]="stepCircleClass(s.n)">
                <ng-container *ngIf="form().step > s.n">
                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </ng-container>
                <ng-container *ngIf="form().step <= s.n">{{ s.n }}</ng-container>
              </div>
              <span class="text-xs mt-1.5 font-medium whitespace-nowrap hidden sm:block transition-colors duration-200"
                [ngClass]="stepLabelClass(s.n)">{{ s.label }}</span>
            </div>
            <div *ngIf="!last" class="flex-1 h-0.5 mx-2 mt-5 rounded-full transition-all duration-500"
              [ngClass]="stepLineClass(s.n)"></div>
          </ng-container>
        </div>
      </div>

      <!-- ─── Step Context Banner ─── -->
      <div *ngIf="ready()" class="border-b transition-colors duration-300" [ngClass]="currentStep().bannerBg">
        <div class="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4 anim-fade-in">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
            [ngClass]="currentStep().iconBg">
            {{ currentStep().icon }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="font-bold text-gray-900">{{ currentStep().label }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ currentStep().desc }}</p>
          </div>
          <div *ngIf="form().step === 2 && liveTotal() > 0"
            class="flex-shrink-0 bg-white border border-brand-100 rounded-xl px-3 py-1.5 text-right shadow-sm">
            <p class="text-xs text-gray-400 leading-tight">Total</p>
            <p class="text-sm font-bold text-brand-600 leading-tight">{{ fmt(liveTotal()) }}</p>
          </div>
          <div *ngIf="form().step === 3 && form().members.length > 0"
            class="flex-shrink-0 bg-white border border-brand-100 rounded-xl px-3 py-1.5 text-center shadow-sm">
            <p class="text-lg font-bold text-brand-600 leading-tight">{{ form().members.length }}</p>
            <p class="text-xs text-gray-400 leading-tight">members</p>
          </div>
        </div>
      </div>

      <!-- ─── Page Content ─── -->
      <div *ngIf="ready()" class="flex-1 overflow-y-auto">
        <div class="max-w-3xl mx-auto px-4 py-6 pb-28">

          <!-- ══ STEP 1: Group Info ══ -->
          <ng-container *ngIf="form().step === 1">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 anim-fade-up">

              <!-- Split Name -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Split Name <span class="text-rose-400">*</span>
                </label>
                <input type="text" inputmode="text"
                  [ngModel]="form().groupName"
                  (ngModelChange)="patchGroupName($event)"
                  placeholder="e.g. Room 5 – May 2026"
                  class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all placeholder:text-gray-300" />
              </div>

              <!-- Billing Period -->
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Billing Period <span class="text-rose-400">*</span>
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1.5 font-medium">From</label>
                    <input type="date"
                      [ngModel]="form().fromDate"
                      (ngModelChange)="patchFromDate($event)"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all text-gray-700" />
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1.5 font-medium">To</label>
                    <input type="date"
                      [ngModel]="form().toDate"
                      (ngModelChange)="patchToDate($event)"
                      [min]="form().fromDate"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all text-gray-700" />
                  </div>
                </div>
                <!-- Live period preview -->
                <div *ngIf="cycleLabel()"
                  class="mt-3 flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 anim-fade-in">
                  <span class="text-brand-500">📅</span>
                  <span class="text-xs font-semibold text-brand-700">{{ cycleLabel() }}</span>
                </div>
              </div>

              <!-- Preview card -->
              <div *ngIf="form().groupName.trim() && cycleLabel()"
                class="border-t border-gray-100 pt-5 anim-fade-in">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Preview</p>
                <div class="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-5 text-white shadow-md shadow-brand-200">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-sm">
                      {{ form().groupName.slice(0,2).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-bold text-base">{{ form().groupName }}</p>
                      <p class="text-brand-200 text-xs">{{ cycleLabel() }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>

          <!-- ══ STEP 2: Expenses ══ -->
          <ng-container *ngIf="form().step === 2">

            <!-- Single compact card — all 3 expenses as rows -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up">

              <!-- Column headers -->
              <div class="flex items-center bg-gray-50 border-b border-gray-100 px-4 py-2.5 gap-3">
                <div class="w-8 flex-shrink-0"></div>
                <span class="flex-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Expense</span>
                <span class="w-32 sm:w-36 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right flex-shrink-0">Amount</span>
                <span class="w-28 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center flex-shrink-0 hidden sm:block">Split</span>
              </div>

              <!-- ── Rent Row ── -->
              <div class="border-b border-gray-100 px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">🏠</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">Room Rent</p>
                    <p class="text-xs text-gray-400 hidden sm:block">Split equally among all</p>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 transition-all w-32 sm:w-36 flex-shrink-0">
                    <span class="px-2 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.rentAmount"
                      (ngModelChange)="patchExpense('rentAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-2 py-2.5 text-sm focus:outline-none min-w-0 font-medium" />
                  </div>
                  <span class="w-28 text-center flex-shrink-0 hidden sm:block">
                    <span class="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">Equal</span>
                  </span>
                </div>
              </div>

              <!-- ── Ration Row ── -->
              <div class="border-b border-gray-100 px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">🛒</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">Ration / Kiryana</p>
                    <p class="text-xs text-gray-400 hidden sm:block">Monthly groceries</p>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 transition-all w-32 sm:w-36 flex-shrink-0">
                    <span class="px-2 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.rationAmount"
                      (ngModelChange)="patchExpense('rationAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-2 py-2.5 text-sm focus:outline-none min-w-0 font-medium" />
                  </div>
                </div>
              </div>

              <!-- ── Vegetable Row ── -->
              <div class="border-b border-gray-100 px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">🥦</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800">Vegetable</p>
                    <p class="text-xs text-gray-400 hidden sm:block">Fresh produce</p>
                  </div>
                  <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 transition-all w-32 sm:w-36 flex-shrink-0">
                    <span class="px-2 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-sm">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="form().expenses.vegetableAmount"
                      (ngModelChange)="patchExpense('vegetableAmount', +$event)"
                      placeholder="0"
                      class="flex-1 px-2 py-2.5 text-sm focus:outline-none min-w-0 font-medium" />
                  </div>
                </div>
              </div>

              <!-- ── Ration + Veggie Split Mode ── -->
              <div class="px-4 py-3.5">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-sm font-semibold text-gray-700">Ration + Veggie split method</span>
                </div>
                <!-- Toggle -->
                <div class="flex gap-2">
                  <button (click)="patchSplitMode('equal')"
                    class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                    [ngClass]="form().expenses.splitMode === 'equal' ? 'bg-brand-500 text-white border-brand-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'">
                    ⚖️ Equal Split
                  </button>
                  <button (click)="patchSplitMode('daywise')"
                    class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                    [ngClass]="form().expenses.splitMode === 'daywise' ? 'bg-brand-500 text-white border-brand-500 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'">
                    📅 Day-wise
                  </button>
                </div>
                <p class="text-xs text-gray-400 mt-2 pl-1">
                  {{ form().expenses.splitMode === 'equal'
                    ? 'Total ÷ included members — everyone pays the same'
                    : 'Total ÷ total days — proportional to days present' }}
                </p>
              </div>
            </div>

            <!-- ── Other Expenses (custom items) ── -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d1 mt-3">
              <div class="flex items-center justify-between bg-gray-50 border-b border-gray-100 px-4 py-2.5">
                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Other Expenses</span>
                <span class="text-xs text-gray-400">split equally among all</span>
              </div>

              <!-- Preset chips -->
              <div class="px-4 pt-3 flex flex-wrap gap-1.5">
                <button *ngFor="let p of extraPresets" (click)="addExtraItem(p)"
                  class="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50 hover:border-brand-300 hover:text-brand-600 transition-colors">
                  + {{ p }}
                </button>
              </div>

              <!-- Item rows -->
              <div class="px-4 py-3 space-y-2">
                <div *ngFor="let item of extraItems(); trackBy: trackExtra" class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-base flex-shrink-0">🧾</div>
                  <input type="text"
                    [ngModel]="item.label"
                    (ngModelChange)="updateExtraItem(item.id, 'label', $event)"
                    placeholder="Item name (e.g. Electricity)"
                    class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 min-w-0" />
                  <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 w-28 flex-shrink-0">
                    <span class="px-2 py-2 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs">₹</span>
                    <input type="number" inputmode="decimal"
                      [ngModel]="item.amount"
                      (ngModelChange)="updateExtraItem(item.id, 'amount', +$event)"
                      placeholder="0"
                      class="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0 font-medium" />
                  </div>
                  <button (click)="removeExtraItem(item.id)"
                    class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">✕</button>
                </div>

                <button (click)="addExtraItem()"
                  class="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-300 hover:text-brand-500 text-sm font-semibold transition-colors">
                  + Add custom item
                </button>
              </div>
            </div>

            <!-- Live Grand Total -->
            <div *ngIf="liveTotal() > 0"
              class="mt-3 bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-md shadow-brand-200 anim-scale-in">
              <div>
                <p class="text-brand-200 text-xs font-medium">Grand Total</p>
                <p class="text-2xl font-bold mt-0.5">{{ fmt(liveTotal()) }}</p>
              </div>
              <div class="text-right text-brand-200 text-xs space-y-0.5">
                <p *ngIf="form().expenses.rentAmount > 0">🏠 {{ fmt(form().expenses.rentAmount) }}</p>
                <p *ngIf="form().expenses.rationAmount > 0">🛒 {{ fmt(form().expenses.rationAmount) }}</p>
                <p *ngIf="form().expenses.vegetableAmount > 0">🥦 {{ fmt(form().expenses.vegetableAmount) }}</p>
                <p *ngFor="let item of extraItems()" >🧾 {{ fmt(item.amount) }}</p>
              </div>
            </div>
          </ng-container>

          <!-- ══ STEP 3: Members ══ -->
          <ng-container *ngIf="form().step === 3">

            <!-- Empty State -->
            <div *ngIf="form().members.length === 0"
              class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-14 text-center mb-4 anim-scale-in">
              <div class="text-5xl mb-4">👥</div>
              <p class="font-bold text-gray-700">No members yet</p>
              <p class="text-sm text-gray-400 mt-1 mb-5">Add everyone sharing the expenses this cycle</p>
              <button (click)="addMember()"
                class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-colors">
                <span class="text-lg leading-none">+</span> Add First Member
              </button>
            </div>

            <!-- Member Cards -->
            <div *ngIf="form().members.length > 0" class="space-y-3 mb-4">
              <div *ngFor="let member of form().members; let i = index; trackBy: trackMember"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 anim-fade-up">

                <!-- Row 1: Avatar + Name + Delete -->
                <div class="flex items-center gap-2.5 mb-3">
                  <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                    [ngClass]="member.name.trim() ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'">
                    {{ member.name.trim() ? member.name.trim().slice(0,2).toUpperCase() : (i + 1) }}
                  </div>
                  <input type="text" #nameInput
                    [ngModel]="member.name"
                    (ngModelChange)="updateMember(member.id, 'name', $event)"
                    placeholder="Member name"
                    class="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all min-w-0" />
                  <button (click)="removeMember(member.id)"
                    class="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
                    ✕
                  </button>
                </div>

                <!-- Row 2: Paid + Days (side by side) -->
                <div class="flex gap-3 mb-3">
                  <!-- Personal Expense Paid -->
                  <div class="flex-1">
                    <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Personal Paid (₹)</label>
                    <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-300 transition-all">
                      <span class="px-2.5 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs">₹</span>
                      <input type="number" inputmode="decimal"
                        [ngModel]="member.personalExpensePaid"
                        (ngModelChange)="updateMember(member.id, 'personalExpensePaid', +$event)"
                        placeholder="0"
                        class="flex-1 px-2.5 py-2.5 text-sm focus:outline-none min-w-0" />
                    </div>
                  </div>
                  <!-- Days Present (only if daywise) -->
                  <div *ngIf="isDaywise()" class="w-28 flex-shrink-0">
                    <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Days Present</label>
                    <input type="number" inputmode="decimal" min="0" max="31"
                      [ngModel]="member.daysPresent"
                      (ngModelChange)="updateMember(member.id, 'daysPresent', +$event)"
                      class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-all" />
                  </div>
                </div>

                <!-- Row 3: Include in Ration+Veggie pool -->
                <div *ngIf="hasRationOrVeg()" class="mb-3">
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox"
                      [ngModel]="member.includeRationVeg"
                      (ngModelChange)="updateMember(member.id, 'includeRationVeg', $event)"
                      class="w-4 h-4 rounded accent-orange-500 cursor-pointer" />
                    <span class="text-sm text-gray-600 font-medium">🛒🥦 Include in Ration &amp; Veggie</span>
                  </label>
                </div>

                <!-- Row 4: UPI ID (optional) -->
                <div class="flex items-center gap-2">
                  <span class="text-sm">💸</span>
                  <input type="text"
                    [ngModel]="member.upiId"
                    (ngModelChange)="updateMember(member.id, 'upiId', $event)"
                    placeholder="UPI ID (optional, for collecting)"
                    class="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300 min-w-0" />
                </div>

              </div>
            </div>

            <!-- Add member button -->
            <button *ngIf="form().members.length > 0" (click)="addMember()"
              class="w-full py-3 border-2 border-dashed border-brand-200 rounded-xl text-brand-500 font-semibold text-sm hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 anim-fade-up anim-d1">
              <span class="text-base leading-none">+</span> Add Another Member
            </button>
          </ng-container>

          <!-- ══ STEP 4: Preview ══ -->
          <ng-container *ngIf="form().step === 4">

            <!-- Success Banner -->
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 mb-6 text-white shadow-lg shadow-emerald-200 anim-scale-in">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✨</div>
                <div>
                  <p class="font-bold text-lg leading-tight">Everything looks good!</p>
                  <p class="text-emerald-100 text-xs mt-0.5">Review the breakdown below and save</p>
                </div>
              </div>
              <div class="border-t border-white/20 mt-3 pt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p class="text-emerald-200">Split</p>
                  <p class="font-semibold truncate">{{ form().groupName }}</p>
                </div>
                <div>
                  <p class="text-emerald-200">Period</p>
                  <p class="font-semibold">{{ cycleLabelShort() }}</p>
                </div>
                <div>
                  <p class="text-emerald-200">Members</p>
                  <p class="font-semibold">{{ form().members.length }}</p>
                </div>
              </div>
            </div>

            <!-- Verification Badge -->
            <div class="mb-5 anim-fade-up"
              [ngClass]="result().verificationOk ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'"
              class="rounded-xl px-4 py-3 flex items-center gap-3">
              <span class="text-xl">{{ result().verificationOk ? '✅' : '❌' }}</span>
              <div>
                <p class="text-sm font-semibold" [ngClass]="result().verificationOk ? 'text-emerald-700' : 'text-red-700'">
                  {{ result().verificationOk ? 'Verification passed' : 'Verification failed' }}
                </p>
                <p class="text-xs" [ngClass]="result().verificationOk ? 'text-emerald-500' : 'text-red-500'">
                  Sum of all shares = {{ fmt(result().grandTotal) }}
                </p>
              </div>
            </div>

            <!-- Expense Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 anim-fade-up anim-d1">
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-lg mb-1">🏠</p>
                <p class="text-xs text-gray-400 mb-1">Rent</p>
                <p class="font-bold text-gray-900 text-sm">{{ fmt(result().totalRent) }}</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-lg mb-1">🛒</p>
                <p class="text-xs text-gray-400 mb-1">Ration</p>
                <p class="font-bold text-gray-900 text-sm">{{ fmt(result().totalRation) }}</p>
              </div>
              <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-lg mb-1">🥦</p>
                <p class="text-xs text-gray-400 mb-1">Vegetable</p>
                <p class="font-bold text-gray-900 text-sm">{{ fmt(result().totalVegetable) }}</p>
              </div>
              <div *ngIf="result().totalExtra > 0" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                <p class="text-lg mb-1">🧾</p>
                <p class="text-xs text-gray-400 mb-1">Other</p>
                <p class="font-bold text-gray-900 text-sm">{{ fmt(result().totalExtra) }}</p>
              </div>
              <div class="bg-brand-500 rounded-xl shadow-sm p-4 text-center col-span-2 sm:col-span-1">
                <p class="text-lg mb-1">💰</p>
                <p class="text-xs text-brand-200 mb-1">Grand Total</p>
                <p class="font-bold text-white">{{ fmt(result().grandTotal) }}</p>
                <p *ngIf="result().shares.length > 0" class="text-xs text-brand-300 mt-1.5 border-t border-white/10 pt-1.5">
                  avg {{ fmt(avgPerMember()) }}/member
                </p>
              </div>
            </div>

            <!-- Breakdown Table -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d2">
              <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Breakdown</h3>
                <span class="text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                  {{ result().shares.length }} members
                </span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm" style="min-width: 460px">
                  <thead>
                    <tr class="border-b border-gray-100">
                      <th class="py-3 px-5 text-left text-xs font-semibold text-gray-500">Member</th>
                      <th *ngIf="isDaywise()" class="py-3 px-4 text-center text-xs font-semibold text-gray-500">📅 Days</th>
                      <th class="py-3 px-4 text-right text-xs font-semibold text-gray-500">🏠 Rent</th>
                      <th *ngIf="result().totalExtra > 0" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">🧾 Other</th>
                      <th *ngIf="hasRationOrVeg()" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">🛒🥦 Ration+Veg</th>
                      <th *ngIf="hasAnyPersonalPaid()" class="py-3 px-4 text-right text-xs font-semibold text-gray-500">✅ Paid</th>
                      <th class="py-3 px-5 text-right text-xs font-semibold text-gray-700">Pay Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let share of result().shares" class="border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                      <td class="py-3.5 px-5">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                            {{ share.memberName.slice(0,2).toUpperCase() }}
                          </div>
                          <span class="font-semibold text-gray-900">{{ share.memberName }}</span>
                        </div>
                      </td>
                      <td *ngIf="isDaywise()" class="py-3.5 px-4 text-center text-gray-700 text-xs font-semibold">
                        {{ share.daysPresent }}d
                      </td>
                      <td class="py-3.5 px-4 text-right text-gray-500 text-xs">{{ fmt(share.rentShare) }}</td>
                      <td *ngIf="result().totalExtra > 0" class="py-3.5 px-4 text-right text-gray-500 text-xs">
                        {{ share.extraShare > 0 ? fmt(share.extraShare) : '—' }}
                      </td>
                      <td *ngIf="hasRationOrVeg()" class="py-3.5 px-4 text-right text-gray-500 text-xs">
                        {{ share.rationVegShare > 0 ? fmt(share.rationVegShare) : '—' }}
                      </td>
                      <td *ngIf="hasAnyPersonalPaid()" class="py-3.5 px-4 text-right text-xs font-medium text-emerald-600">
                        {{ share.personalExpensePaid > 0 ? '−' + fmt(share.personalExpensePaid) : '—' }}
                      </td>
                      <td class="py-3.5 px-5 text-right">
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
            </div>
          </ng-container>

        </div>
      </div>

      <!-- ─── Bottom Action Bar ─── -->
      <div *ngIf="ready()" class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg z-20">
        <!-- Step dots -->
        <div class="flex justify-center gap-1.5 pt-3">
          <div *ngFor="let s of steps"
            class="h-1 rounded-full transition-all duration-300"
            [ngClass]="form().step === s.n ? 'w-6 bg-brand-500' : (form().step > s.n ? 'w-2 bg-brand-300' : 'w-2 bg-gray-200')">
          </div>
        </div>
        <div class="max-w-3xl mx-auto px-4 py-3 flex gap-3">
          <button *ngIf="form().step > 1" (click)="prevStep()"
            class="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors flex-shrink-0">
            ← Back
          </button>
          <button *ngIf="form().step < 4" (click)="nextStep()"
            class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold text-sm shadow-sm shadow-brand-200 transition-all">
            {{ form().step === 3 ? 'Review & Preview →' : 'Continue →' }}
          </button>
          <button *ngIf="form().step === 4" (click)="saveGroup()"
            class="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm shadow-sm shadow-emerald-200 transition-all">
            🎉 Save Split
          </button>
        </div>
      </div>

    </div>
  `
})
export class NewGroupComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(GroupFormService);
  private groupService = inject(GroupService);
  private rosterService = inject(RosterService);
  private ui = inject(UiService);

  private rosterId = this.route.snapshot.queryParamMap.get('roster') ?? '';
  private seeded = false;
  readonly ready = signal(false);

  @ViewChildren('nameInput') nameInputs!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {
    // Seed once IndexedDB has loaded — handles hard refresh / direct link to
    // /split/new?roster=x where the roster isn't in memory yet on first tick.
    effect(() => {
      if (this.seeded) return;
      if (this.rosterService.isLoading()) return;   // wait for load
      const roster = this.rosterId ? this.rosterService.getRoster(this.rosterId) : undefined;
      this.seeded = true;
      if (!roster) {
        this.ui.toast('Pick a group first', '⚠️');
        this.router.navigate(['/groups']);
        return;
      }
      this.formService.seedFromRoster(roster.name, roster.members);
      this.ready.set(true);
    }, { allowSignalWrites: true });
  }

  readonly form = this.formService.form;
  readonly fmt = formatCurrency;

  readonly steps = [
    {
      n: 1, label: 'Split Info', icon: '🏷️',
      iconBg: 'bg-blue-100', bannerBg: 'bg-blue-50/40 border-blue-100/60',
      badgeClass: 'bg-blue-50 border-blue-100 text-blue-700',
      desc: 'Name this split and set the billing period',
    },
    {
      n: 2, label: 'Expenses', icon: '💰',
      iconBg: 'bg-amber-100', bannerBg: 'bg-amber-50/40 border-amber-100/60',
      badgeClass: 'bg-amber-50 border-amber-100 text-amber-700',
      desc: 'Enter expense amounts and choose split preferences',
    },
    {
      n: 3, label: 'Members', icon: '👥',
      iconBg: 'bg-brand-100', bannerBg: 'bg-brand-50/40 border-brand-100/60',
      badgeClass: 'bg-brand-50 border-brand-100 text-brand-700',
      desc: 'Add all members sharing expenses this cycle',
    },
    {
      n: 4, label: 'Preview', icon: '✨',
      iconBg: 'bg-emerald-100', bannerBg: 'bg-emerald-50/40 border-emerald-100/60',
      badgeClass: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      desc: 'Review the breakdown and save your split',
    },
  ];

  readonly currentStep = computed(() => this.steps[this.form().step - 1]);
  readonly stepProgress = computed(() => ((this.form().step - 1) / 3) * 100);
  readonly result = computed(() => calculateShares(this.form().expenses, this.form().members));
  readonly liveTotal = computed(() => {
    const e = this.form().expenses;
    const extra = (e.extraItems ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    return e.rentAmount + e.rationAmount + e.vegetableAmount + extra;
  });

  readonly extraPresets = ['Electricity', 'WiFi', 'Gas', 'Water', 'Maid', 'Milk', 'Maintenance'];

  readonly cycleLabel = computed(() => {
    const { fromDate, toDate } = this.form();
    if (!fromDate || !toDate) return '';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${new Date(fromDate + 'T00:00:00').toLocaleDateString('en-IN', opts)} – ${new Date(toDate + 'T00:00:00').toLocaleDateString('en-IN', opts)}`;
  });

  readonly avgPerMember = computed(() => {
    const count = this.result().shares.length;
    return count > 0 ? this.result().grandTotal / count : 0;
  });

  readonly cycleLabelShort = computed(() => {
    const { fromDate, toDate } = this.form();
    if (!fromDate || !toDate) return '';
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${new Date(fromDate + 'T00:00:00').toLocaleDateString('en-IN', opts)} – ${new Date(toDate + 'T00:00:00').toLocaleDateString('en-IN', opts)}`;
  });

  stepCircleClass(n: number): string {
    const s = this.form().step;
    if (s > n) return 'bg-brand-500 text-white shadow-sm';
    if (s === n) return 'bg-brand-500 text-white ring-4 ring-brand-100 shadow-md shadow-brand-200';
    return 'bg-gray-100 text-gray-400';
  }

  stepLabelClass(n: number): string {
    const s = this.form().step;
    if (s > n) return 'text-brand-500';
    if (s === n) return 'text-brand-600 font-semibold';
    return 'text-gray-400';
  }

  stepLineClass(n: number): string {
    return this.form().step > n ? 'bg-brand-400' : 'bg-gray-200';
  }

  back(): void {
    if (this.form().step === 1) this.router.navigate(['/group', this.rosterId]);
    else this.prevStep();
  }

  prevStep(): void {
    const s = this.form().step;
    if (s > 1) this.formService.setStep((s - 1) as 1 | 2 | 3 | 4);
  }

  nextStep(): void {
    const f = this.form();
    if (f.step === 1) {
      if (!f.groupName.trim()) { this.ui.toast('Please enter a split name', '⚠️'); return; }
      if (!f.fromDate || !f.toDate) { this.ui.toast('Please select both From and To dates', '⚠️'); return; }
      if (f.toDate < f.fromDate) { this.ui.toast('End date must be after start date', '⚠️'); return; }
    }
    if (f.step === 3 && f.members.length === 0) { this.ui.toast('Please add at least one member', '⚠️'); return; }
    if (f.step === 3) {
      const invalid = f.members.find(m => !m.name.trim());
      if (invalid) { this.ui.toast('Please fill all member names', '⚠️'); return; }
    }
    if (f.step < 4) this.formService.setStep((f.step + 1) as 2 | 3 | 4);
  }

  async saveGroup(): Promise<void> {
    const f = this.form();
    const result = calculateShares(f.expenses, f.members);
    const id = nanoid();
    await this.groupService.addGroup({
      id,
      name: f.groupName,
      rosterId: this.rosterId,
      cycleLabel: this.cycleLabel(),
      fromDate: f.fromDate,
      toDate: f.toDate,
      createdAt: new Date().toISOString(),
      expenses: f.expenses,
      members: f.members,
      result,
    });
    this.formService.reset();
    this.ui.toast('Split saved', '🎉');
    this.router.navigate(['/split', id]);
  }

  patchGroupName(v: string): void {
    this.formService.setGroupInfo(v, this.form().fromDate, this.form().toDate);
  }

  patchFromDate(v: string): void {
    this.formService.setGroupInfo(this.form().groupName, v, this.form().toDate);
  }

  patchToDate(v: string): void {
    this.formService.setGroupInfo(this.form().groupName, this.form().fromDate, v);
  }

  patchExpense(key: keyof ExpenseConfig, value: any): void {
    this.formService.setExpenses({ ...this.form().expenses, [key]: value });
  }

  patchSplitMode(mode: SplitMode): void {
    this.formService.setExpenses({ ...this.form().expenses, splitMode: mode });
  }

  extraItems(): ExtraItem[] {
    return this.form().expenses.extraItems ?? [];
  }

  addExtraItem(label = ''): void {
    const items = [...this.extraItems(), { id: nanoid(), label, amount: 0 }];
    this.formService.setExpenses({ ...this.form().expenses, extraItems: items });
  }

  updateExtraItem(id: string, key: 'label' | 'amount', value: string | number): void {
    const items = this.extraItems().map(i => (i.id === id ? { ...i, [key]: value } : i));
    this.formService.setExpenses({ ...this.form().expenses, extraItems: items });
  }

  removeExtraItem(id: string): void {
    const items = this.extraItems().filter(i => i.id !== id);
    this.formService.setExpenses({ ...this.form().expenses, extraItems: items });
  }

  addMember(): void {
    this.formService.addMember();
    setTimeout(() => {
      const inputs = this.nameInputs.toArray();
      if (inputs.length) inputs[inputs.length - 1].nativeElement.focus();
    }, 50);
  }

  updateMember(id: string, key: keyof Member, value: any): void {
    this.formService.updateMember(id, { [key]: value });
  }

  removeMember(id: string): void { this.formService.removeMember(id); }

  isDaywise(): boolean { return this.form().expenses.splitMode === 'daywise'; }
  hasRationOrVeg(): boolean { return this.form().expenses.rationAmount > 0 || this.form().expenses.vegetableAmount > 0; }
  hasAnyPersonalPaid(): boolean { return this.form().members.some(m => m.personalExpensePaid > 0); }

  trackMember(_: number, member: Member): string { return member.id; }
  trackExtra(_: number, item: ExtraItem): string { return item.id; }
}
