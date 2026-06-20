import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { UiService } from '../../services/ui.service';
import { Trip, TripExpense, TripMember, Settlement } from '../../models/trip.model';
import { buildUpiUri, buildUpiPayLink, UpiRequest } from '../../utils/upi';
import { shareFor } from '../../utils/trip-calculator';
import { IconComponent } from '../../components/icon/icon.component';
import { PayQrComponent } from '../../components/pay-qr/pay-qr.component';

interface ExpenseEdit {
  id: string;
  description: string;
  amount: number | null;
  paidBy: string;
  splitAmong: Record<string, boolean>;
  date: string;
  splitType: 'equal' | 'exact';
  splits: Record<string, number | null>;
}

@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PayQrComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button (click)="router.navigate(['/trips'])"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <app-icon name="arrow-left" class="w-5 h-5"></app-icon>
          </button>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 truncate">{{ trip()?.name }}</p>
            <p class="text-xs text-gray-400">{{ trip()?.members?.length }} members · {{ trip()?.expenses?.length }} expenses</p>
          </div>
          <button (click)="shareSummary()"
            class="flex items-center gap-1 text-xs font-semibold text-brand-600 border border-brand-200 hover:bg-brand-50 transition-colors px-2.5 py-1.5 rounded-lg">
            <app-icon name="share" class="w-3.5 h-3.5"></app-icon>
            Share
          </button>
          <button (click)="shareBreakdown()" title="Share breakdown + pay links"
            class="flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors px-2.5 py-1.5 rounded-lg">
            <app-icon name="qr-code" class="w-3.5 h-3.5"></app-icon>
            Share + Pay
          </button>
          <button (click)="toggleArchive()" [title]="trip()?.archived ? 'Unarchive' : 'Archive'"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-600 hover:bg-gray-100 transition-colors flex-shrink-0">
            <app-icon [name]="trip()?.archived ? 'unarchive' : 'archive'" class="w-5 h-5"></app-icon>
          </button>
          <button (click)="deleteTrip()" title="Delete"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0">
            <app-icon name="trash" class="w-5 h-5"></app-icon>
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

          <!-- Simplify toggle -->
          <div class="flex items-center gap-2 mb-3 bg-white border border-gray-100 rounded-xl px-3 py-2">
            <button (click)="toggleSimplify()"
              class="w-10 h-6 rounded-full flex-shrink-0 relative transition-colors"
              [ngClass]="(t.simplifyDebts ?? true) ? 'bg-brand-500' : 'bg-gray-200'">
              <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                [ngClass]="(t.simplifyDebts ?? true) ? 'left-[1.125rem]' : 'left-0.5'"></span>
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-gray-700">Simplify debts</p>
              <p class="text-[11px] text-gray-400 leading-tight">
                {{ (t.simplifyDebts ?? true) ? 'Fewest transfers' : 'Pay exactly who you owe' }}
              </p>
            </div>
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
              [ngClass]="isSettled(s) ? 'border-emerald-100 bg-emerald-50' : isPartial(s) ? 'border-amber-100 bg-amber-50/40' : 'border-gray-100'">

              <div class="flex items-center gap-3">
                <!-- From avatar -->
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  [ngClass]="isSettled(s) ? 'bg-emerald-100 text-emerald-700' : isPartial(s) ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-500'">
                  {{ s.fromName.slice(0,2).toUpperCase() }}
                </div>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900">
                    <span [ngClass]="isSettled(s) ? 'text-emerald-700' : isPartial(s) ? 'text-amber-700' : 'text-rose-500'">{{ s.fromName }}</span>
                    <span class="text-gray-400 font-normal mx-1">pays</span>
                    <span class="text-brand-600">{{ s.toName }}</span>
                  </p>
                  <p class="text-base font-bold mt-0.5" [ngClass]="isSettled(s) ? 'text-emerald-600' : 'text-gray-900'">
                    ₹{{ s.amount | number:'1.0-2' }}
                    <span *ngIf="isPartial(s)" class="text-xs font-semibold text-amber-600 ml-1">· ₹{{ settleRemaining(s) | number:'1.0-2' }} left</span>
                  </p>
                </div>

                <div class="flex-shrink-0 flex flex-col items-end gap-1">
                  <button (click)="quickToggleSettle(i, s)"
                    class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border whitespace-nowrap"
                    [ngClass]="isSettled(s)
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-white'
                      : isPartial(s)
                        ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                        : 'bg-brand-50 text-brand-600 border-brand-200 hover:bg-brand-500 hover:text-white hover:border-brand-500'">
                    {{ isSettled(s) ? '✓ Paid' : 'Mark Paid' }}
                  </button>
                  <button *ngIf="!isSettled(s)" (click)="openSettle(i, s)"
                    title="Record a partial amount"
                    class="text-[11px] font-medium text-gray-400 hover:text-brand-600 underline underline-offset-2">
                    Partial
                  </button>
                </div>
              </div>

              <!-- Pay via UPI / Remind row (unsettled only) -->
              <div *ngIf="!isSettled(s)" class="flex items-center gap-2 mt-2.5">
                <a *ngIf="payeeUpi(s.to)" [href]="upiLink(s)"
                  class="flex-1 text-center text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                  💸 Pay {{ s.toName }} via UPI
                </a>
                <button *ngIf="payeeUpi(s.to)" (click)="openPayQr(s)" title="Show QR / share pay link"
                  class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors">
                  <app-icon name="qr-code" class="w-4 h-4"></app-icon>
                </button>
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
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member Balances</h2>
            <button (click)="openEditMembers()" class="text-xs font-semibold text-brand-600 hover:underline">Edit / add members</button>
          </div>
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
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expense Log</h2>
            <button (click)="openNewExpense()"
              class="flex items-center gap-1 text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors">
              + Add expense
            </button>
          </div>
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
                  <p class="text-sm font-semibold text-gray-900">
                    {{ e.description }}
                    <span *ngIf="e.splitType === 'exact'"
                      class="ml-1 align-middle text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">unequal</span>
                  </p>
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
          <h3 class="text-lg font-bold text-gray-900 mb-4">{{ editIsNew() ? 'Add expense' : 'Edit expense' }}</h3>

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

          <div class="mb-3">
            <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Split among</label>
            <div class="flex flex-wrap gap-1.5">
              <button *ngFor="let m of trip()?.members" (click)="ed.splitAmong[m.id] = !ed.splitAmong[m.id]"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="ed.splitAmong[m.id] ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-gray-50 text-gray-400 border-gray-200'">
                {{ m.name }}
              </button>
            </div>
          </div>

          <!-- Split type -->
          <div class="mb-3">
            <div class="flex gap-2">
              <button (click)="ed.splitType = 'equal'"
                class="flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="ed.splitType === 'equal' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-200'">
                ⚖️ Equally
              </button>
              <button (click)="ed.splitType = 'exact'"
                class="flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors"
                [ngClass]="ed.splitType === 'exact' ? 'bg-brand-500 text-white border-brand-500' : 'bg-gray-50 text-gray-600 border-gray-200'">
                ✏️ Exact amounts
              </button>
            </div>
          </div>

          <!-- Exact amount inputs -->
          <div *ngIf="ed.splitType === 'exact'" class="mb-3 space-y-2">
            <div *ngFor="let m of trip()?.members">
              <div *ngIf="ed.splitAmong[m.id]" class="flex items-center gap-2">
                <span class="text-sm text-gray-700 flex-1 min-w-0 truncate">{{ m.name }}</span>
                <div class="relative w-28">
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input [(ngModel)]="ed.splits[m.id]" type="number" min="0" placeholder="0"
                    class="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between text-xs font-semibold rounded-lg px-3 py-2"
              [ngClass]="exactBalanced(ed) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
              <span>{{ exactBalanced(ed) ? '✓ Matches total' : 'Assigned' }}</span>
              <span>₹{{ exactAssigned(ed) | number:'1.0-2' }} / ₹{{ +(ed.amount || 0) | number:'1.0-2' }}</span>
            </div>
          </div>

          <div class="flex gap-3 mt-2">
            <button (click)="editExp.set(null)"
              class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveExpense()" [disabled]="!canSaveExpense()"
              class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-bold text-sm transition-colors">Save</button>
          </div>
        </div>
      </div>

      <!-- ═══ EDIT MEMBERS SHEET ═══ -->
      <div *ngIf="editMembers() as rows" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="editMembers.set(null)"></div>
        <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-5"
          style="animation: sheetUp 0.25s cubic-bezier(.32,.72,0,1)">
          <h3 class="text-lg font-bold text-gray-900 mb-1">Members</h3>
          <p class="text-xs text-gray-400 mb-4">Add anyone you forgot, or add a UPI ID for collecting.</p>

          <div class="space-y-2 mb-3">
            <div *ngFor="let m of rows" class="bg-gray-50 rounded-xl p-2.5">
              <div class="flex items-center gap-2">
                <input [(ngModel)]="m.name" type="text" placeholder="Member name"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
                <button (click)="removeMemberRow(m.id)" *ngIf="rows.length > 1"
                  class="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">✕</button>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-sm">💸</span>
                <input [(ngModel)]="m.upiId" type="text" placeholder="UPI ID (optional)"
                  class="flex-1 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
              </div>
            </div>
          </div>

          <button (click)="addMemberRow()"
            class="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-brand-300 hover:text-brand-500 text-sm font-semibold transition-colors mb-4">
            + Add member
          </button>

          <div class="flex gap-3">
            <button (click)="editMembers.set(null)"
              class="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
            <button (click)="saveMembers()"
              class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors">Save</button>
          </div>
        </div>
      </div>

      <!-- ═══ PAY QR SHEET ═══ -->
      <app-pay-qr *ngIf="payReq() as r" [req]="r" (closed)="payReq.set(null)"></app-pay-qr>

      <!-- ═══ RECORD PAYMENT SHEET ═══ -->
      <div *ngIf="settleEdit() as e" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closeSettle()"></div>
        <div class="relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
          style="animation: sheetUp 0.28s cubic-bezier(.32,.72,0,1)">
          <h3 class="text-lg font-bold text-gray-900 text-center">Record payment</h3>
          <p class="text-sm text-gray-500 text-center mt-1">
            {{ e.s.fromName }} → {{ e.s.toName }} ·
            <span class="font-semibold text-brand-600">₹{{ e.s.amount | number:'1.0-2' }}</span>
          </p>
          <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-1.5">Amount paid so far (₹)</label>
          <div class="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-brand-400 transition-colors">
            <span class="px-4 py-3 bg-gray-50 border-r border-gray-200 text-gray-400 font-bold">₹</span>
            <input type="number" inputmode="decimal" [(ngModel)]="settleValue" placeholder="0"
              class="flex-1 px-3 py-3 text-lg font-bold text-gray-900 focus:outline-none min-w-0" />
          </div>
          <p class="text-xs text-gray-400 mt-1.5">Enter the running total paid. Leave 0 to mark unpaid.</p>
          <div class="flex gap-2 mt-5">
            <button (click)="markSettleFull()"
              class="flex-1 py-3 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-sm transition-colors">
              Paid in full
            </button>
            <button (click)="saveSettle()"
              class="flex-1 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors">
              Save
            </button>
          </div>
          <button (click)="closeSettle()" class="mt-3 w-full text-gray-400 text-sm py-1.5">Cancel</button>
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
    (this.trip()?.settlements ?? []).filter(s => this.isSettled(s)).length,
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
      const owes = t.expenses.reduce((s, e) => s + shareFor(e, m.id), 0);
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

  async toggleSimplify(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    await this.tripService.updateTrip({ ...t, simplifyDebts: !(t.simplifyDebts ?? true) });
  }

  exactAssigned(ed: ExpenseEdit): number {
    return Object.keys(ed.splitAmong)
      .filter(id => ed.splitAmong[id])
      .reduce((s, id) => s + (Number(ed.splits[id]) || 0), 0);
  }

  exactBalanced(ed: ExpenseEdit): boolean {
    return Math.abs(this.exactAssigned(ed) - (Number(ed.amount) || 0)) < 0.01 && (Number(ed.amount) || 0) > 0;
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

  // QR / shareable pay-link sheet
  readonly payReq = signal<UpiRequest | null>(null);
  openPayQr(s: { to: string; toName: string; amount: number }): void {
    const t = this.trip();
    this.payReq.set({
      vpa: this.payeeUpi(s.to),
      name: s.toName,
      amount: s.amount,
      note: t ? `Split: ${t.name}` : 'Split Karo',
    });
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

  // ─── Add / edit / delete a single expense ─────────────────────────
  readonly editExp = signal<ExpenseEdit | null>(null);
  readonly editIsNew = signal(false);

  openNewExpense(): void {
    const t = this.trip();
    if (!t) return;
    const splitAmong: Record<string, boolean> = {};
    const splits: Record<string, number | null> = {};
    t.members.forEach(m => { splitAmong[m.id] = true; splits[m.id] = null; });
    this.editIsNew.set(true);
    this.editExp.set({
      id: crypto.randomUUID(),
      description: '',
      amount: null,
      paidBy: t.members[0]?.id ?? '',
      splitAmong,
      date: new Date().toISOString().slice(0, 10),
      splitType: 'equal',
      splits,
    });
  }

  openEditExpense(e: TripExpense): void {
    const splitAmong: Record<string, boolean> = {};
    const splits: Record<string, number | null> = {};
    (this.trip()?.members ?? []).forEach(m => {
      splitAmong[m.id] = e.splitAmong.includes(m.id);
      splits[m.id] = e.splits?.[m.id] ?? null;
    });
    this.editIsNew.set(false);
    this.editExp.set({
      id: e.id,
      description: e.description,
      amount: e.amount,
      paidBy: e.paidBy,
      splitAmong,
      date: this.expDate(e),
      splitType: e.splitType === 'exact' ? 'exact' : 'equal',
      splits,
    });
  }

  canSaveExpense(): boolean {
    const ed = this.editExp();
    if (!ed) return false;
    const base = !!ed.description.trim()
      && Number(ed.amount) > 0
      && !!ed.paidBy
      && Object.values(ed.splitAmong).some(v => v);
    if (!base) return false;
    if (ed.splitType === 'exact') return this.exactBalanced(ed);
    return true;
  }

  async saveExpense(): Promise<void> {
    const t = this.trip();
    const ed = this.editExp();
    if (!t || !ed || !this.canSaveExpense()) return;
    const splitAmong = Object.entries(ed.splitAmong).filter(([, v]) => v).map(([k]) => k);
    const splits: Record<string, number> = {};
    if (ed.splitType === 'exact') {
      splitAmong.forEach(id => (splits[id] = Number(ed.splits[id]) || 0));
    }
    const built: TripExpense = {
      id: ed.id,
      description: ed.description.trim(),
      amount: Number(ed.amount),
      paidBy: ed.paidBy,
      splitAmong,
      date: ed.date,
      splitType: ed.splitType,
      ...(ed.splitType === 'exact' ? { splits } : {}),
    };
    const isNew = !t.expenses.some(e => e.id === ed.id);
    const expenses: TripExpense[] = isNew
      ? [...t.expenses, built]
      : t.expenses.map(e => e.id === ed.id ? built : e);
    await this.tripService.updateTrip({ ...t, expenses });
    this.editExp.set(null);
    this.ui.toast(isNew ? 'Expense added' : 'Expense updated', '✅');
  }

  // ─── Edit / add members ──────────────────────────────────────────
  readonly editMembers = signal<{ id: string; name: string; upiId: string }[] | null>(null);

  openEditMembers(): void {
    const t = this.trip();
    if (!t) return;
    this.editMembers.set(t.members.map(m => ({ id: m.id, name: m.name, upiId: m.upiId ?? '' })));
  }

  addMemberRow(): void {
    this.editMembers.update(rows => rows ? [...rows, { id: crypto.randomUUID(), name: '', upiId: '' }] : rows);
  }

  removeMemberRow(id: string): void {
    const t = this.trip();
    if (t && t.expenses.some(e => e.paidBy === id || e.splitAmong.includes(id))) {
      this.ui.toast('This member is used in an expense — edit that first', '⚠️');
      return;
    }
    this.editMembers.update(rows => rows ? rows.filter(m => m.id !== id) : rows);
  }

  async saveMembers(): Promise<void> {
    const t = this.trip();
    const rows = this.editMembers();
    if (!t || !rows) return;
    const cleaned: TripMember[] = rows
      .filter(r => r.name.trim())
      .map(r => ({ id: r.id, name: r.name.trim(), ...(r.upiId.trim() ? { upiId: r.upiId.trim() } : {}) }));
    if (cleaned.length === 0) { this.ui.toast('Add at least one member', '⚠️'); return; }
    const ids = new Set(cleaned.map(m => m.id));
    const stillReferenced = t.expenses.every(e => ids.has(e.paidBy) && e.splitAmong.every(s => ids.has(s)));
    if (!stillReferenced) { this.ui.toast("Can't remove a member used in an expense", '⚠️'); return; }
    await this.tripService.updateTrip({ ...t, members: cleaned });
    this.editMembers.set(null);
    this.ui.toast('Members updated', '✅');
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

  // ─── Partial settlement tracking ──────────────────────────────────
  settlePaid(s: Settlement): number { return TripService.settlementPaid(s); }
  settleRemaining(s: Settlement): number { return Math.round((s.amount - this.settlePaid(s)) * 100) / 100; }
  isSettled(s: Settlement): boolean { return this.settlePaid(s) >= s.amount - 0.01; }
  isPartial(s: Settlement): boolean { const p = this.settlePaid(s); return p > 0.01 && !this.isSettled(s); }

  settleLabel(s: Settlement): string {
    if (this.isSettled(s)) return '✓ Paid';
    if (this.isPartial(s)) return '₹' + this.fmtNum(this.settlePaid(s)) + ' / ' + this.fmtNum(s.amount);
    return 'Record';
  }

  private fmtNum(n: number): string { return (Math.round(n * 100) / 100).toLocaleString('en-IN'); }

  // Record-payment sheet
  readonly settleEdit = signal<{ index: number; s: Settlement } | null>(null);
  settleValue = '';

  openSettle(index: number, s: Settlement): void {
    const paid = this.settlePaid(s);
    this.settleValue = paid > 0 ? String(paid) : '';
    this.settleEdit.set({ index, s });
  }

  closeSettle(): void { this.settleEdit.set(null); }

  /** One-tap: fully settle if not already, otherwise clear back to unpaid. */
  async quickToggleSettle(index: number, s: Settlement): Promise<void> {
    const t = this.trip();
    if (!t) return;
    await this.tripService.setSettlementPaidAmount(t.id, index, this.isSettled(s) ? 0 : s.amount);
  }

  async saveSettle(): Promise<void> {
    const e = this.settleEdit();
    const t = this.trip();
    if (!e || !t) return;
    await this.tripService.setSettlementPaidAmount(t.id, e.index, +this.settleValue || 0);
    this.settleEdit.set(null);
  }

  async markSettleFull(): Promise<void> {
    const e = this.settleEdit();
    const t = this.trip();
    if (!e || !t) return;
    await this.tripService.setSettlementPaidAmount(t.id, e.index, e.s.amount);
    this.settleEdit.set(null);
  }

  async toggleArchive(): Promise<void> {
    const t = this.trip();
    if (!t) return;
    const next = !t.archived;
    await this.tripService.setArchived(t.id, next);
    this.ui.toast(next ? 'Trip archived' : 'Trip unarchived', next ? '📦' : '↩️');
    if (next) this.router.navigate(['/trips']);
  }

  // ─── Share trip summary ───────────────────────────────────────────
  private buildSummary(): string {
    const t = this.trip();
    if (!t) return '';
    const rupee = (n: number) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
    const lines: string[] = [`✈️ *${t.name}* — Split Karo`, ''];
    lines.push(`💰 Total: ${rupee(this.grandTotal())}`);
    lines.push(`👥 ${t.members.length} members`);
    lines.push('');
    if (t.settlements.length === 0) {
      lines.push('✓ Everyone is settled up — no payments needed!');
    } else {
      lines.push('*Settle up:*');
      for (const s of t.settlements) {
        const upi = this.payeeUpi(s.to);
        lines.push(`• ${s.fromName} → ${s.toName}: ${rupee(s.amount)}${s.paid ? ' ✅' : ''}${upi ? `  (UPI: ${upi})` : ''}`);
      }
    }
    lines.push('', '_via Split Karo_');
    return lines.join('\n');
  }

  shareSummary(): void {
    const text = this.buildSummary();
    if (!text) return;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => this.ui.toast('Summary copied'));
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      Object.assign(ta.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.ui.toast('Summary copied');
    }
  }

  // ─── Share: breakdown table + pay links ───────────────────────────
  shareBreakdown(): void {
    const t = this.trip();
    if (!t) return;
    this.shareTextOut(this.buildBreakdownText(t), `${t.name} — Split Karo`);
  }

  private buildBreakdownText(t: Trip): string {
    const rupee = (n: number) => '₹' + (Math.round(Math.abs(n) * 100) / 100).toLocaleString('en-IN');
    const bals = this.memberBalances();
    const DIV = '------------------------------';

    const lines: string[] = [];
    lines.push(`✈️ *${t.name}*`);
    lines.push(`💰 Total spent: ${rupee(this.grandTotal())}  •  👥 ${t.members.length} members`);

    if (t.expenses.length) {
      lines.push('', '*WHO PAID WHAT*', DIV);
      for (const m of t.members) {
        const mine = t.expenses.filter(e => e.paidBy === m.id);
        const paid = mine.reduce((a, e) => a + e.amount, 0);
        lines.push(`👤 *${m.name}* spent ${rupee(paid)}`);
        if (mine.length) {
          for (const e of mine) lines.push(`   • ${e.description || 'Expense'} — ${rupee(e.amount)}`);
        } else {
          lines.push('   • nothing yet');
        }
        lines.push('');
      }
    }

    lines.push('*FINAL SPLIT*', DIV);
    for (const b of bals) {
      const tail = b.balance > 0.01 ? `✅ gets back ${rupee(b.balance)}`
                 : b.balance < -0.01 ? `🔴 needs to pay ${rupee(b.balance)}`
                 : '⚪ settled';
      lines.push(`👤 *${b.name}* — share ${rupee(b.owes)}  →  ${tail}`);
    }

    if (t.settlements.length === 0) {
      lines.push('', DIV, '✅ Everyone is settled up!');
    } else {
      lines.push('', DIV, '', '*WHO PAYS WHOM*', '');
      for (const s of t.settlements) {
        lines.push(`💸 ${s.fromName} pays ${s.toName} ${rupee(s.amount)}${s.paid ? ' ✅' : ''}`);
        const upi = this.payeeUpi(s.to);
        if (!s.paid && upi) {
          const link = buildUpiPayLink({ vpa: upi, name: s.toName, amount: s.amount, note: `Split: ${t.name}` });
          lines.push(`   👉 ${link}`);
        }
        lines.push('');
      }
    }
    lines.push('_Made with Split Karo_');
    return lines.join('\n');
  }

  private shareTextOut(text: string, title: string): void {
    if (!text) return;
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => this.ui.toast('Copied to clipboard', '📋'));
      return;
    }
    // Insecure-context fallback (e.g. http LAN): textarea copy preserves newlines.
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); this.ui.toast('Copied to clipboard', '📋'); } catch {}
    document.body.removeChild(ta);
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
