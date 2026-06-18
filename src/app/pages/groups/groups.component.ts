import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { RosterService } from '../../services/roster.service';
import { ThemeService } from '../../services/theme.service';
import { ThemeToggleComponent } from '../../components/theme-toggle/theme-toggle.component';
import { Roster } from '../../models/group.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, ThemeToggleComponent],
  template: `
    <div class="min-h-screen bg-white flex flex-col pb-20">

      <!-- Navbar -->
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

      <!-- Loading -->
      <div *ngIf="isLoading()" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
          <p class="text-sm font-medium text-gray-400">Loading your groups…</p>
        </div>
      </div>

      <div *ngIf="!isLoading()" class="bg-slate-50 flex-1">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3 mb-6 anim-fade-up">
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Groups</p>
              <p class="text-2xl font-bold text-gray-900">{{ activeRosters().length }}</p>
            </div>
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">People</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalMembers() }}</p>
            </div>
            <div class="bg-brand-500 rounded-xl shadow-sm p-4">
              <p class="text-xs font-semibold text-brand-200 uppercase tracking-wide mb-1">Splits</p>
              <p class="text-2xl font-bold text-white">{{ totalSplits() }}</p>
            </div>
          </div>

          <!-- Empty -->
          <div *ngIf="rosters().length === 0" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center anim-fade-up anim-d2">
            <p class="text-3xl mb-3">📋</p>
            <p class="font-semibold text-gray-700 mb-1">No groups yet</p>
            <p class="text-sm text-gray-400 mb-5">Create a group of people once, then split every cycle</p>
            <button (click)="goToNew()"
              class="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm">
              + New Group
            </button>
          </div>

          <!-- Roster cards -->
          <div *ngIf="activeRosters().length > 0" class="space-y-3 anim-fade-up anim-d2">
            <div *ngFor="let r of activeRosters()" (click)="openRoster(r.id)"
              class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50 hover:border-brand-200 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 bg-brand-50 rounded-xl flex-shrink-0 flex items-center justify-center">
                  <span class="text-brand-600 font-bold text-sm">{{ r.name.slice(0,2).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-gray-900 truncate">{{ r.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">
                    👥 {{ r.members.length }} members · 🧾 {{ splitCount(r.id) }} splits
                  </p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-xs text-gray-400">latest</p>
                  <p class="font-bold text-brand-600 text-sm">{{ latestTotal(r.id) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Archived -->
          <div *ngIf="archivedRosters().length > 0" class="mt-6">
            <button (click)="showArchived.set(!showArchived())"
              class="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
              <span>{{ showArchived() ? '▾' : '▸' }}</span>
              Archived ({{ archivedRosters().length }})
            </button>
            <div *ngIf="showArchived()" class="mt-3 space-y-2">
              <div *ngFor="let r of archivedRosters()" (click)="openRoster(r.id)"
                class="bg-white/70 rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 cursor-pointer active:bg-gray-50 transition-colors">
                <div class="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {{ r.name.slice(0,2).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-700 truncate">{{ r.name }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ r.members.length }} members · {{ splitCount(r.id) }} splits</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class GroupsComponent {
  private router  = inject(Router);
  private groups  = inject(GroupService);
  private roster  = inject(RosterService);
  readonly theme  = inject(ThemeService);
  readonly fmt    = formatCurrency;

  readonly rosters   = this.roster.rosters;
  readonly isLoading = computed(() => this.roster.isLoading() || this.groups.isLoading());
  readonly activeRosters   = computed(() => this.rosters().filter(r => !r.archived));
  readonly archivedRosters = computed(() => this.rosters().filter(r => r.archived));
  readonly showArchived = signal(false);

  readonly totalMembers = computed(() => this.activeRosters().reduce((s, r) => s + r.members.length, 0));
  readonly totalSplits  = computed(() => this.groups.groups().length);

  splitCount(rosterId: string): number {
    return this.groups.groupsForRoster(rosterId).length;
  }

  latestTotal(rosterId: string): string {
    const splits = this.groups.groupsForRoster(rosterId);
    return splits.length ? this.fmt(splits[0].result.grandTotal) : '—';
  }

  goToNew(): void { this.router.navigate(['/new']); }
  openRoster(id: string): void { this.router.navigate(['/group', id]); }
}
