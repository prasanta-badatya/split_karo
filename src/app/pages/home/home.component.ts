import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <span class="text-white font-bold text-sm tracking-tight">SK</span>
            </div>
            <div>
              <h1 class="text-base font-bold text-gray-900 leading-tight">Split Karo</h1>
              <p class="text-xs text-gray-400 hidden sm:block">Expense splitter for roommates</p>
            </div>
          </div>
          <button *ngIf="groups().length > 0" (click)="goToNew()"
            class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 shadow-sm">
            <span class="text-base leading-none">+</span> New Group
          </button>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        <!-- ─── Empty State ─── -->
        <ng-container *ngIf="groups().length === 0">
          <div class="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
            <div class="w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center text-5xl mb-6">💰</div>
            <h2 class="text-2xl font-bold text-gray-800">No groups yet</h2>
            <p class="text-gray-400 mt-2 max-w-xs text-sm leading-relaxed">
              Create your first expense group to start splitting bills with your roommates.
            </p>
            <button (click)="goToNew()"
              class="mt-8 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md transition-colors text-sm">
              + Create First Group
            </button>
          </div>
        </ng-container>

        <!-- ─── Groups ─── -->
        <ng-container *ngIf="groups().length > 0">

          <!-- Stats Strip -->
          <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
              <p class="text-2xl font-bold text-gray-900">{{ groups().length }}</p>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Members</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalMembers() }}</p>
            </div>
            <div class="bg-brand-500 rounded-xl shadow-sm p-4">
              <p class="text-xs font-semibold text-brand-200 uppercase tracking-wide mb-1">Total</p>
              <p class="text-xl font-bold text-white truncate">{{ fmt(totalAmount()) }}</p>
            </div>
          </div>

          <!-- Section Label -->
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Groups</h2>
          </div>

          <!-- ─── Desktop Table ─── -->
          <div class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50">
                    <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Group Name</th>
                    <th class="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                    <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rent</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ration</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Vegetable</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Grand Total</th>
                    <th class="py-3.5 px-5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let group of groups()"
                    (click)="viewGroup(group.id)"
                    class="border-b border-gray-50 last:border-b-0 hover:bg-brand-50 cursor-pointer transition-colors group/row">
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                          {{ group.name.slice(0,2).toUpperCase() }}
                        </div>
                        <span class="font-semibold text-gray-900 group-hover/row:text-brand-600 transition-colors">{{ group.name }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-4 text-gray-400 text-xs">{{ group.cycleLabel }}</td>
                    <td class="py-4 px-4 text-center">
                      <span class="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">{{ group.members.length }}</span>
                    </td>
                    <td class="py-4 px-4 text-right text-gray-500 text-xs font-medium">{{ fmt(group.result.totalRent) }}</td>
                    <td class="py-4 px-4 text-right text-gray-500 text-xs font-medium">{{ fmt(group.result.totalRation) }}</td>
                    <td class="py-4 px-4 text-right text-gray-500 text-xs font-medium">{{ fmt(group.result.totalVegetable) }}</td>
                    <td class="py-4 px-4 text-right">
                      <span class="font-bold text-brand-600">{{ fmt(group.result.grandTotal) }}</span>
                    </td>
                    <td class="py-4 px-5 text-right">
                      <button (click)="deleteGroup($event, group.id)"
                        class="text-xs font-medium text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover/row:opacity-100 px-2 py-1 rounded">
                        Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ─── Mobile List ─── -->
          <div class="md:hidden space-y-2">
            <div *ngFor="let group of groups()"
              (click)="viewGroup(group.id)"
              class="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50 transition-colors">
              <div class="w-11 h-11 bg-brand-50 rounded-xl flex-shrink-0 flex items-center justify-center">
                <span class="text-brand-600 font-bold text-sm">{{ group.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 truncate text-sm">{{ group.name }}</p>
                <p class="text-xs text-gray-400 truncate mt-0.5">{{ group.cycleLabel }} · {{ group.members.length }} members</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="font-bold text-brand-600 text-sm">{{ fmt(group.result.grandTotal) }}</p>
                <button (click)="deleteGroup($event, group.id)"
                  class="text-xs text-gray-300 hover:text-rose-500 transition-colors mt-0.5 block ml-auto">
                  Delete
                </button>
              </div>
            </div>
          </div>

        </ng-container>
      </main>
    </div>
  `
})
export class HomeComponent {
  private router = inject(Router);
  private groupService = inject(GroupService);
  readonly fmt = formatCurrency;
  readonly groups = this.groupService.groups;
  readonly totalAmount = computed(() => this.groups().reduce((s, g) => s + g.result.grandTotal, 0));
  readonly totalMembers = computed(() => this.groups().reduce((s, g) => s + g.members.length, 0));

  goToNew(): void { this.router.navigate(['/new']); }
  viewGroup(id: string): void { this.router.navigate(['/group', id]); }
  deleteGroup(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('Delete this group?')) this.groupService.deleteGroup(id);
  }
}
