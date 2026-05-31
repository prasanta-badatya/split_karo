import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { UiService } from '../../services/ui.service';
import { ThemeService } from '../../services/theme.service';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { Group } from '../../models/group.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent],
  template: `
    <div class="min-h-screen bg-white flex flex-col pb-20">

      <!-- ═══ NAVBAR ═══ -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <span class="text-white font-bold text-xs tracking-tight">SK</span>
            </div>
            <span class="text-base font-bold text-gray-900">Groups</span>
          </div>
          <div class="flex items-center gap-2.5">
            <app-theme-toggle></app-theme-toggle>
            <button (click)="goToNew()"
              class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
              + New Group
            </button>
          </div>
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

          <!-- Stats Strip -->
          <div class="grid grid-cols-3 gap-3 mb-6 anim-fade-up">
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
              <p class="text-2xl font-bold text-gray-900">{{ activeGroups().length }}</p>
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
          <div *ngIf="activeGroups().length > 0" class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden anim-fade-up anim-d2">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50">
                    <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                    <th class="py-3.5 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                    <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Split</th>
                    <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Verify</th>
                    <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg / Person</th>
                    <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Grand Total</th>
                    <th class="py-3.5 px-5 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let group of activeGroups()"
                    (click)="viewGroup(group.id)"
                    class="border-b border-gray-50 last:border-b-0 hover:bg-brand-50 cursor-pointer transition-colors group/row">

                    <!-- Group Name -->
                    <td class="py-4 px-5">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-xs font-bold text-brand-600 flex-shrink-0">
                          {{ group.name.slice(0,2).toUpperCase() }}
                        </div>
                        <div>
                          <p class="font-semibold text-gray-900 group-hover/row:text-brand-600 transition-colors">{{ group.name }}</p>
                          <p class="text-xs text-gray-400 mt-0.5">{{ group.members.length }} members</p>
                        </div>
                      </div>
                    </td>

                    <!-- Period -->
                    <td class="py-4 px-4 text-gray-400 text-xs">{{ group.cycleLabel }}</td>

                    <!-- Split Mode -->
                    <td class="py-4 px-4 text-center">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                        [ngClass]="group.expenses.splitMode === 'daywise'
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-brand-50 text-brand-600'">
                        {{ group.expenses.splitMode === 'daywise' ? '📅 Day-wise' : '⚖️ Equal' }}
                      </span>
                    </td>

                    <!-- Verification -->
                    <td class="py-4 px-4 text-center">
                      <span class="text-base" [title]="group.result.verificationOk ? 'Verification passed' : 'Verification failed'">
                        {{ group.result.verificationOk ? '✅' : '❌' }}
                      </span>
                    </td>

                    <!-- Payment Progress -->
                    <td class="py-4 px-4 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <span class="text-xs font-semibold"
                          [ngClass]="paidCount(group) === owingCount(group) && owingCount(group) > 0
                            ? 'text-emerald-600' : 'text-gray-600'">
                          {{ paidCount(group) }} / {{ owingCount(group) }}
                        </span>
                        <!-- Progress bar -->
                        <div class="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                            [ngClass]="paidCount(group) === owingCount(group) && owingCount(group) > 0 ? 'bg-emerald-500' : 'bg-brand-400'"
                            [style.width]="owingCount(group) > 0 ? (paidCount(group) / owingCount(group) * 100) + '%' : '0%'">
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Per-person avg -->
                    <td class="py-4 px-4 text-right">
                      <span class="text-xs font-semibold text-gray-700">{{ fmt(perPersonAvg(group)) }}</span>
                    </td>

                    <!-- Grand Total -->
                    <td class="py-4 px-4 text-right">
                      <span class="font-bold text-brand-600">{{ fmt(group.result.grandTotal) }}</span>
                    </td>

                    <!-- Actions -->
                    <td class="py-4 px-5 text-right whitespace-nowrap">
                      <button (click)="archiveGroup($event, group.id, true)"
                        class="text-xs font-medium text-gray-300 hover:text-brand-600 transition-colors opacity-0 group-hover/row:opacity-100 px-2 py-1 rounded">
                        Archive
                      </button>
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

          <!-- Mobile Cards -->
          <div *ngIf="activeGroups().length > 0" class="md:hidden space-y-3 anim-fade-up anim-d2">
            <div *ngFor="let group of activeGroups()"
              (click)="viewGroup(group.id)"
              class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50 transition-colors">

              <!-- Top row: avatar + name + total -->
              <div class="flex items-center gap-3 mb-3">
                <div class="w-11 h-11 bg-brand-50 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <span class="text-brand-600 font-bold text-sm">{{ group.name.slice(0,2).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-gray-900 truncate">{{ group.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ group.cycleLabel }}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="font-bold text-brand-600">{{ fmt(group.result.grandTotal) }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ fmt(perPersonAvg(group)) }} avg</p>
                </div>
              </div>

              <!-- Info chips row -->
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <!-- Split mode -->
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  [ngClass]="group.expenses.splitMode === 'daywise' ? 'bg-indigo-50 text-indigo-600' : 'bg-brand-50 text-brand-600'">
                  {{ group.expenses.splitMode === 'daywise' ? '📅 Day-wise' : '⚖️ Equal' }}
                </span>
                <!-- Verification -->
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  [ngClass]="group.result.verificationOk ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'">
                  {{ group.result.verificationOk ? '✅ Verified' : '❌ Failed' }}
                </span>
                <!-- Members -->
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  👥 {{ group.members.length }} members
                </span>
              </div>

              <!-- Payment progress bar -->
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all"
                    [ngClass]="paidCount(group) === owingCount(group) && owingCount(group) > 0 ? 'bg-emerald-500' : 'bg-brand-400'"
                    [style.width]="owingCount(group) > 0 ? (paidCount(group) / owingCount(group) * 100) + '%' : '0%'">
                  </div>
                </div>
                <span class="text-xs font-semibold flex-shrink-0"
                  [ngClass]="paidCount(group) === owingCount(group) && owingCount(group) > 0 ? 'text-emerald-600' : 'text-gray-500'">
                  {{ paidCount(group) }}/{{ owingCount(group) }} paid
                </span>
                <button (click)="archiveGroup($event, group.id, true)"
                  class="text-xs text-gray-300 hover:text-brand-600 transition-colors ml-1 flex-shrink-0">
                  Archive
                </button>
                <button (click)="deleteGroup($event, group.id)"
                  class="text-xs text-gray-300 hover:text-rose-500 transition-colors flex-shrink-0">
                  Delete
                </button>
              </div>

            </div>
          </div>

          <!-- Archived section -->
          <div *ngIf="archivedGroups().length > 0" class="mt-6">
            <button (click)="showArchived.set(!showArchived())"
              class="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <span>{{ showArchived() ? '▾' : '▸' }}</span>
              Archived ({{ archivedGroups().length }})
            </button>
            <div *ngIf="showArchived()" class="mt-3 space-y-2">
              <div *ngFor="let group of archivedGroups()"
                (click)="viewGroup(group.id)"
                class="bg-white/70 rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors">
                <div class="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {{ group.name.slice(0,2).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-700 truncate">{{ group.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ group.cycleLabel }} · {{ fmt(group.result.grandTotal) }}</p>
                </div>
                <button (click)="archiveGroup($event, group.id, false)"
                  class="text-xs font-semibold text-brand-600 hover:underline flex-shrink-0">Unarchive</button>
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
  private ui = inject(UiService);
  readonly theme = inject(ThemeService);
  readonly fmt          = formatCurrency;
  readonly groups       = this.groupService.groups;
  readonly isLoading    = this.groupService.isLoading;
  readonly activeGroups   = computed(() => this.groups().filter(g => !g.archived));
  readonly archivedGroups = computed(() => this.groups().filter(g => g.archived));
  readonly showArchived = signal(false);
  readonly totalAmount  = computed(() => this.activeGroups().reduce((s, g) => s + g.result.grandTotal, 0));
  readonly totalMembers = computed(() => this.activeGroups().reduce((s, g) => s + g.members.length, 0));

  async archiveGroup(event: Event, id: string, archived: boolean): Promise<void> {
    event.stopPropagation();
    await this.groupService.setArchived(id, archived);
    this.ui.toast(archived ? 'Group archived' : 'Group unarchived', archived ? '📦' : '↩️');
  }

  owingCount(g: Group): number {
    return g.result.shares.filter(s => s.total > 0).length;
  }

  paidCount(g: Group): number {
    return g.result.shares.filter(s => s.total > 0 && !!(g.paidMembers?.[s.memberId])).length;
  }

  perPersonAvg(g: Group): number {
    return g.members.length > 0 ? g.result.grandTotal / g.members.length : 0;
  }

  goHome(): void { this.router.navigate(['/']); }
  goToNew(): void { this.router.navigate(['/new']); }
  viewGroup(id: string): void { this.router.navigate(['/group', id]); }

  async deleteGroup(event: Event, id: string): Promise<void> {
    event.stopPropagation();
    const group = this.groups().find(g => g.id === id);
    const ok = await this.ui.confirm({
      title: 'Delete this group?',
      message: group ? `"${group.name}" and its breakdown will be removed.` : '',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await this.groupService.deleteGroup(id);
    this.ui.toast('Group deleted', '🗑️');
  }
}
