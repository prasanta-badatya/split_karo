import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-white flex flex-col">

      <!-- ═══ NAVBAR ═══ -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <button (click)="goHome()"
              class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-brand-600 active:bg-brand-700 transition-colors">
              <span class="text-white font-bold text-sm tracking-tight">SK</span>
            </button>
            <span class="text-base font-bold text-gray-900">Split Karo</span>
          </div>
          <button (click)="goToNew()"
            class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
            + New Group
          </button>
        </div>
      </header>

      <!-- ═══ LOADING ═══ -->
      <div *ngIf="isLoading()" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
          <p class="text-sm font-medium text-gray-400">Loading your groups…</p>
        </div>
      </div>

      <!-- ═══ DASHBOARD ═══ -->
      <div *ngIf="!isLoading()" class="bg-slate-50 flex-1">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

          <!-- Back link -->
          <button (click)="goHome()" class="flex items-center gap-1.5 text-xs text-brand-600 font-semibold mb-5 hover:underline anim-fade-up">
            ← Back to Home
          </button>

          <!-- Stats Strip -->
          <div class="grid grid-cols-3 gap-3 mb-6 anim-fade-up">
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

          <!-- Section label -->
          <div class="flex items-center justify-between mb-3 anim-fade-up anim-d1">
            <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Groups</h2>
          </div>

          <!-- Empty state -->
          <div *ngIf="groups().length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center anim-fade-up anim-d2">
            <p class="text-3xl mb-3">📋</p>
            <p class="font-semibold text-gray-700 mb-1">No groups yet</p>
            <p class="text-sm text-gray-400 mb-5">Create your first group to get started</p>
            <button (click)="goToNew()"
              class="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm">
              + New Group
            </button>
          </div>

          <!-- Desktop Table -->
          <div *ngIf="groups().length > 0" class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d2">
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

          <!-- Mobile List -->
          <div *ngIf="groups().length > 0" class="md:hidden space-y-2 anim-fade-up anim-d2">
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

        </div>
      </div>

    </div>
  `
})
export class GroupsComponent {
  private router = inject(Router);
  private groupService = inject(GroupService);
  readonly fmt          = formatCurrency;
  readonly groups       = this.groupService.groups;
  readonly isLoading    = this.groupService.isLoading;
  readonly totalAmount  = computed(() => this.groups().reduce((s, g) => s + g.result.grandTotal, 0));
  readonly totalMembers = computed(() => this.groups().reduce((s, g) => s + g.members.length, 0));

  goHome(): void { this.router.navigate(['/']); }
  goToNew(): void { this.router.navigate(['/new']); }
  viewGroup(id: string): void { this.router.navigate(['/group', id]); }

  deleteGroup(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('Delete this group?')) this.groupService.deleteGroup(id);
  }
}
