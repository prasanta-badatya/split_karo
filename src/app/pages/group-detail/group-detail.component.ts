import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { ImageShareService } from '../../services/image-share.service';
import { UiService } from '../../services/ui.service';
import { Group, Member, ExpenseConfig, ExtraItem } from '../../models/group.model';
import { calculateShares } from '../../utils/calculator';
import { formatCurrency, nanoid } from '../../utils/formatters';
import { buildUpiUri } from '../../utils/upi';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

          <ng-container *ngIf="!isEditing()">
            <button (click)="shareImage()" [disabled]="isSharing()"
              class="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
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
          </ng-container>

        </div>
      </header>

      <!-- Not Found -->
      <div *ngIf="!group()" class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div class="text-4xl mb-4">🔍</div>
        <h2 class="font-bold text-gray-700 text-lg">Group not found</h2>
        <button (click)="goBack()" class="mt-5 text-brand-600 font-semibold text-sm hover:underline">← Go Back</button>
      </div>

      <!-- ═══ VIEW MODE ═══ -->
      <div *ngIf="group() as g" class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        <!-- ── EDIT PANEL ── -->
        <div *ngIf="isEditing()" class="mb-6 bg-white rounded-2xl border border-brand-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 bg-brand-50 flex items-center gap-2">
            <span class="text-base">✏️</span>
            <h2 class="font-bold text-brand-800 text-sm">Edit Group</h2>
            <span class="text-xs text-brand-500 ml-1">Changes recalculate automatically on save</span>
          </div>

          <!-- Expense amounts -->
          <div class="px-5 py-4 border-b border-gray-100">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expense Amounts</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">🏠 Room Rent (₹)</label>
                <input [(ngModel)]="editRent" type="number" min="0"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">🛒 Ration (₹)</label>
                <input [(ngModel)]="editRation" type="number" min="0"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">🥦 Vegetable (₹)</label>
                <input [(ngModel)]="editVegetable" type="number" min="0"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </div>

          <!-- Members -->
          <div class="px-5 py-4">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Members</p>
            <div class="space-y-3">
              <div *ngFor="let m of editMembers(); let i = index"
                class="border border-gray-100 rounded-xl p-3 bg-gray-50">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                    {{ m.name.slice(0,2).toUpperCase() || (i + 1) }}
                  </div>
                  <input [(ngModel)]="m.name" type="text" placeholder="Member name"
                    class="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
                  <button (click)="removeEditMember(m.id)" *ngIf="editMembers().length > 1"
                    class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">✕</button>
                </div>
                <div class="grid grid-cols-2 gap-2" [ngClass]="g.expenses.splitMode === 'daywise' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
                  <div>
                    <label class="block text-xs font-medium text-gray-400 mb-1">Already Paid (₹)</label>
                    <input [(ngModel)]="m.personalExpensePaid" type="number" min="0"
                      class="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div *ngIf="g.expenses.splitMode === 'daywise'">
                    <label class="block text-xs font-medium text-gray-400 mb-1">Days Present</label>
                    <input [(ngModel)]="m.daysPresent" type="number" min="0"
                      class="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div class="flex items-center gap-2 pt-5">
                    <input type="checkbox" [(ngModel)]="m.includeRationVeg" [id]="'irv-' + i"
                      class="rounded border-gray-300 text-brand-500 focus:ring-brand-400" />
                    <label [for]="'irv-' + i" class="text-xs font-medium text-gray-500">Ration & Veggie</label>
                  </div>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-sm">💸</span>
                  <input [(ngModel)]="m.upiId" type="text" placeholder="UPI ID (optional, for collecting)"
                    class="flex-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
                </div>
              </div>
            </div>
            <button (click)="addEditMember()"
              class="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-300 hover:text-brand-500 text-sm font-semibold transition-colors">
              + Add member
            </button>
          </div>

          <!-- Other expenses editor -->
          <div class="px-5 py-4 border-t border-gray-100">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Other Expenses <span class="text-gray-400 normal-case font-normal">· split equally</span></p>
            <div class="flex flex-wrap gap-1.5 mb-3">
              <button *ngFor="let p of extraPresets" (click)="addEditExtra(p)"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50 hover:border-brand-300 hover:text-brand-600 transition-colors">
                + {{ p }}
              </button>
            </div>
            <div class="space-y-2">
              <div *ngFor="let item of editExtraItems()" class="flex items-center gap-2">
                <input type="text" [ngModel]="item.label" (ngModelChange)="updateEditExtra(item.id, 'label', $event)"
                  placeholder="Item name" class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
                <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden w-28 flex-shrink-0 bg-white">
                  <span class="px-2 py-2 bg-gray-50 border-r border-gray-200 text-gray-400 text-xs">₹</span>
                  <input type="number" [ngModel]="item.amount" (ngModelChange)="updateEditExtra(item.id, 'amount', +$event)"
                    placeholder="0" class="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0" />
                </div>
                <button (click)="removeEditExtra(item.id)"
                  class="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">✕</button>
              </div>
              <button (click)="addEditExtra()"
                class="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-300 hover:text-brand-500 text-sm font-semibold transition-colors">
                + Add custom item
              </button>
            </div>
          </div>
        </div>

        <!-- Edit / Cancel+Save row -->
        <div class="mb-5 flex gap-2">
          <button *ngIf="!isEditing()" (click)="startEdit()"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            ✏️ Edit Expenses
          </button>
          <ng-container *ngIf="isEditing()">
            <button (click)="saveEdit()" [disabled]="isSaving()"
              class="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-sm">
              {{ isSaving() ? 'Saving…' : '✓ Save Changes' }}
            </button>
            <button (click)="cancelEdit()"
              class="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-400 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </ng-container>
        </div>

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
          <div *ngIf="g.result.totalExtra > 0" class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">🧾</span>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Other</p>
            </div>
            <p class="text-xl font-bold text-gray-900">{{ fmt(g.result.totalExtra) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">Equal split</p>
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

        <!-- Average Info Bar -->
        <div class="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <span class="text-xl flex-shrink-0">📊</span>
          <div *ngIf="g.expenses.splitMode === 'daywise'">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Daily Average (Ration + Veggie)</p>
            <p class="text-base font-bold text-brand-600 mt-0.5">
              {{ fmt(dailyAvg(g)) }} <span class="text-xs font-normal text-gray-400">per day</span>
            </p>
          </div>
          <div *ngIf="g.expenses.splitMode === 'equal'">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Per Person Average</p>
            <p class="text-base font-bold text-brand-600 mt-0.5">
              {{ fmt(perPersonAvg(g)) }} <span class="text-xs font-normal text-gray-400">per member (Rent + Ration + Veggie)</span>
            </p>
          </div>
        </div>

        <!-- Settle Up via UPI -->
        <div *ngIf="!isEditing() && groupSettlements().length > 0" class="mb-4">
          <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Settle Up</h2>
          <div class="space-y-2">
            <div *ngFor="let s of groupSettlements()"
              class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {{ s.fromName.slice(0,2).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">
                    <span class="text-rose-500">{{ s.fromName }}</span>
                    <span class="text-gray-400 font-normal mx-1">pays</span>
                    <span class="text-brand-600">{{ s.toName }}</span>
                  </p>
                  <p class="text-base font-bold text-gray-900 mt-0.5">{{ fmt(s.amount) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2.5">
                <a *ngIf="payeeUpi(s.toId)" [href]="upiLink(s)"
                  class="flex-1 text-center text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                  💸 Pay {{ s.toName }} via UPI
                </a>
                <a [href]="whatsappLink(s)" target="_blank" rel="noopener"
                  class="text-xs font-semibold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  [ngClass]="payeeUpi(s.toId) ? 'flex-shrink-0' : 'flex-1 text-center'">
                  💬 Remind on WhatsApp
                </a>
              </div>
            </div>
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
                  <th *ngIf="g.result.totalExtra > 0" class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">🧾 Other</th>
                  <th *ngIf="hasRationOrVeg(g)" class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">🛒🥦 Ration+Veg</th>
                  <th *ngIf="hasPersonalPaid(g)" class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">✅ Paid</th>
                  <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
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
                  <td *ngIf="g.result.totalExtra > 0" class="py-4 px-4 text-right text-gray-500 text-xs font-medium">
                    {{ share.extraShare > 0 ? fmt(share.extraShare) : '—' }}
                  </td>
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
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    [ngClass]="isPaid(share.memberId) && share.total > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'">
                    {{ isPaid(share.memberId) && share.total > 0 ? '✓' : share.memberName.slice(0,2).toUpperCase() }}
                  </div>
                  <div>
                    <span class="font-bold text-gray-900">{{ share.memberName }}</span>
                    <span *ngIf="isDaywise(g)" class="ml-2 text-xs text-gray-400 font-medium">{{ share.daysPresent }}d</span>
                    <span *ngIf="isPaid(share.memberId) && share.total > 0"
                      class="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Paid</span>
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
                    class="text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors">
                    {{ isPaid(share.memberId) ? '✓ Paid' : 'Mark Paid' }}
                  </button>
                </div>
              </div>
              <div class="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                <div class="flex justify-between text-gray-500">
                  <span>🏠 Rent</span>
                  <span class="font-medium text-gray-700">{{ fmt(share.rentShare) }}</span>
                </div>
                <div *ngIf="share.extraShare > 0" class="flex justify-between text-gray-500">
                  <span>🧾 Other</span>
                  <span class="font-medium text-gray-700">{{ fmt(share.extraShare) }}</span>
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
  `,
})
export class GroupDetailComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private groupService = inject(GroupService);
  private imageShare   = inject(ImageShareService);
  private ui           = inject(UiService);

  readonly fmt        = formatCurrency;
  readonly group      = signal<Group | undefined>(undefined);
  readonly isSharing  = signal(false);
  readonly isEditing  = signal(false);
  readonly isSaving   = signal(false);
  private groupId     = '';

  // Edit state
  editRent      = 0;
  editRation    = 0;
  editVegetable = 0;
  readonly editMembers    = signal<Member[]>([]);
  readonly editExtraItems = signal<ExtraItem[]>([]);
  readonly extraPresets = ['Electricity', 'WiFi', 'Gas', 'Water', 'Maid', 'Milk', 'Maintenance'];

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.group.set(this.groupService.getGroup(this.groupId));
  }

  startEdit(): void {
    const g = this.group();
    if (!g) return;
    this.editRent      = g.expenses.rentAmount;
    this.editRation    = g.expenses.rationAmount;
    this.editVegetable = g.expenses.vegetableAmount;
    this.editMembers.set(g.members.map(m => ({ ...m })));
    this.editExtraItems.set((g.expenses.extraItems ?? []).map(i => ({ ...i })));
    this.isEditing.set(true);
  }

  addEditExtra(label = ''): void {
    this.editExtraItems.update(items => [...items, { id: nanoid(), label, amount: 0 }]);
  }

  updateEditExtra(id: string, key: 'label' | 'amount', value: string | number): void {
    this.editExtraItems.update(items => items.map(i => (i.id === id ? { ...i, [key]: value } : i)));
  }

  removeEditExtra(id: string): void {
    this.editExtraItems.update(items => items.filter(i => i.id !== id));
  }

  addEditMember(): void {
    this.editMembers.update(ms => [...ms, {
      id: nanoid(),
      name: '',
      daysPresent: 15,
      includeRationVeg: true,
      personalExpensePaid: 0,
      upiId: '',
    }]);
  }

  removeEditMember(id: string): void {
    this.editMembers.update(ms => ms.filter(m => m.id !== id));
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  async saveEdit(): Promise<void> {
    const g = this.group();
    if (!g) return;
    this.isSaving.set(true);
    const expenses: ExpenseConfig = {
      ...g.expenses,
      rentAmount:      Number(this.editRent)      || 0,
      rationAmount:    Number(this.editRation)    || 0,
      vegetableAmount: Number(this.editVegetable) || 0,
      extraItems: this.editExtraItems()
        .filter(i => i.label.trim() || (Number(i.amount) || 0) > 0)
        .map(i => ({ ...i, amount: Number(i.amount) || 0 })),
    };
    const members = this.editMembers()
      .filter(m => m.name.trim())
      .map(m => ({
        ...m,
        name:                m.name.trim(),
        daysPresent:         Number(m.daysPresent)         || 0,
        personalExpensePaid: Number(m.personalExpensePaid) || 0,
        upiId:               (m.upiId ?? '').trim() || undefined,
      }));
    if (members.length === 0) {
      this.isSaving.set(false);
      this.ui.toast('Add at least one member', '⚠️');
      return;
    }
    const result = calculateShares(expenses, members);
    const updated: Group = { ...g, expenses, members, result };
    await this.groupService.updateGroup(updated);
    this.group.set(updated);
    this.isEditing.set(false);
    this.isSaving.set(false);
    this.ui.toast('Changes saved', '✅');
  }

  // Minimal "who pays whom" derived from member net balances, for UPI settling
  readonly groupSettlements = computed(() => {
    const g = this.group();
    if (!g) return [];
    const creditors = g.result.shares.filter(s => s.total < -0.01)
      .map(s => ({ id: s.memberId, name: s.memberName, amt: -s.total }))
      .sort((a, b) => b.amt - a.amt);
    const debtors = g.result.shares.filter(s => s.total > 0.01)
      .map(s => ({ id: s.memberId, name: s.memberName, amt: s.total }))
      .sort((a, b) => b.amt - a.amt);
    const out: { fromName: string; toId: string; toName: string; amount: number }[] = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const pay = Math.min(creditors[ci].amt, debtors[di].amt);
      out.push({ fromName: debtors[di].name, toId: creditors[ci].id, toName: creditors[ci].name, amount: pay });
      creditors[ci].amt -= pay; debtors[di].amt -= pay;
      if (creditors[ci].amt < 0.01) ci++;
      if (debtors[di].amt < 0.01) di++;
    }
    return out;
  });

  payeeUpi(memberId: string): string {
    return this.group()?.members.find(m => m.id === memberId)?.upiId ?? '';
  }

  upiLink(s: { toId: string; toName: string; amount: number }): string {
    const g = this.group();
    return buildUpiUri(this.payeeUpi(s.toId), s.toName, s.amount, g ? `${g.name}` : 'Split Karo');
  }

  whatsappLink(s: { fromName: string; toId: string; toName: string; amount: number }): string {
    const g = this.group();
    const amt = this.fmt(s.amount);
    const upi = this.payeeUpi(s.toId);
    let text = `Hi ${s.fromName}, please pay ${amt} to ${s.toName}`;
    if (g) text += ` for "${g.name}"`;
    if (upi) text += `. UPI: ${upi}`;
    text += ' — via Split Karo';
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  isDaywise(g: Group): boolean { return g.expenses.splitMode === 'daywise'; }
  hasRationOrVeg(g: Group): boolean { return g.result.totalRation > 0 || g.result.totalVegetable > 0; }
  hasPersonalPaid(g: Group): boolean { return g.result.shares.some(s => s.personalExpensePaid > 0); }

  dailyAvg(g: Group): number {
    const pool = g.result.totalRation + g.result.totalVegetable;
    const totalDays = g.members.filter(m => m.includeRationVeg).reduce((s, m) => s + m.daysPresent, 0);
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

  goBack(): void { this.router.navigate(['/groups']); }

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
}
