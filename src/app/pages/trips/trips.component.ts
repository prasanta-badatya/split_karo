import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TripService } from '../../services/trip.service';
import { Trip } from '../../models/trip.model';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col pb-20">

      <!-- NAVBAR -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <span class="text-white font-bold text-sm">SK</span>
            </div>
            <span class="text-base font-bold text-gray-900">Trips</span>
          </div>
          <button (click)="router.navigate(['/trips/new'])"
            class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
            + New Trip
          </button>
        </div>
      </header>

      <!-- LOADING -->
      <div *ngIf="isLoading()" class="flex-1 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>

      <!-- CONTENT -->
      <div *ngIf="!isLoading()" class="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Trips</p>
            <p class="text-2xl font-bold text-gray-900">{{ trips().length }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalExpenses() }}</p>
          </div>
          <div class="bg-brand-500 rounded-xl shadow-sm p-4">
            <p class="text-xs font-semibold text-brand-200 uppercase tracking-wide mb-1">Total</p>
            <p class="text-xl font-bold text-white truncate">₹{{ totalAmount() | number:'1.0-0' }}</p>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="trips().length === 0"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p class="text-4xl mb-3">✈️</p>
          <p class="font-semibold text-gray-700 mb-1">No trips yet</p>
          <p class="text-sm text-gray-400 mb-5">Plan a trip and split expenses fairly</p>
          <button (click)="router.navigate(['/trips/new'])"
            class="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors shadow-sm">
            + New Trip
          </button>
        </div>

        <!-- Desktop Table -->
        <div *ngIf="trips().length > 0" class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="py-3.5 px-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trip</th>
                <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Members</th>
                <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Expenses</th>
                <th class="py-3.5 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Settled</th>
                <th class="py-3.5 px-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Total</th>
                <th class="py-3.5 px-5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trip of trips()"
                (click)="router.navigate(['/trip', trip.id])"
                class="border-b border-gray-50 last:border-b-0 hover:bg-brand-50 cursor-pointer transition-colors group/row">
                <td class="py-4 px-5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                      {{ trip.name.slice(0,2).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-gray-900 group-hover/row:text-brand-600 transition-colors">{{ trip.name }}</p>
                      <p class="text-xs text-gray-400 mt-0.5">{{ trip.createdAt | date:'d MMM y' }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4 text-center text-sm text-gray-600">{{ trip.members.length }}</td>
                <td class="py-4 px-4 text-center text-sm text-gray-600">{{ trip.expenses.length }}</td>
                <td class="py-4 px-4 text-center">
                  <span class="text-xs font-semibold"
                    [ngClass]="settledCount(trip) === trip.settlements.length && trip.settlements.length > 0 ? 'text-emerald-600' : 'text-gray-500'">
                    {{ settledCount(trip) }}/{{ trip.settlements.length }}
                  </span>
                </td>
                <td class="py-4 px-4 text-right font-bold text-brand-600">₹{{ tripTotal(trip) | number:'1.0-0' }}</td>
                <td class="py-4 px-5 text-right">
                  <button (click)="deleteTrip($event, trip.id)"
                    class="text-xs font-medium text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover/row:opacity-100 px-2 py-1 rounded">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div *ngIf="trips().length > 0" class="md:hidden space-y-3">
          <div *ngFor="let trip of trips()"
            (click)="router.navigate(['/trip', trip.id])"
            class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-11 h-11 bg-indigo-50 rounded-xl flex-shrink-0 flex items-center justify-center">
                <span class="text-indigo-600 font-bold text-sm">{{ trip.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold text-gray-900 truncate">{{ trip.name }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ trip.createdAt | date:'d MMM y' }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="font-bold text-brand-600">₹{{ tripTotal(trip) | number:'1.0-0' }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ trip.members.length }} members</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all"
                  [ngClass]="settledCount(trip) === trip.settlements.length && trip.settlements.length > 0 ? 'bg-emerald-500' : 'bg-brand-400'"
                  [style.width]="trip.settlements.length > 0 ? (settledCount(trip) / trip.settlements.length * 100) + '%' : '0%'">
                </div>
              </div>
              <span class="text-xs font-semibold flex-shrink-0"
                [ngClass]="settledCount(trip) === trip.settlements.length && trip.settlements.length > 0 ? 'text-emerald-600' : 'text-gray-500'">
                {{ settledCount(trip) }}/{{ trip.settlements.length }} settled
              </span>
              <button (click)="deleteTrip($event, trip.id)"
                class="text-xs text-gray-300 hover:text-rose-500 transition-colors ml-1 flex-shrink-0">
                Delete
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- BOTTOM NAV -->
      <nav class="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 flex">
        <a routerLink="/groups"
          class="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <span class="text-xl">🏠</span>
          <span class="text-xs font-semibold">Home Expenses</span>
        </a>
        <a routerLink="/trips"
          class="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-brand-600 border-t-2 border-brand-500 transition-colors">
          <span class="text-xl">✈️</span>
          <span class="text-xs font-semibold">Trips</span>
        </a>
      </nav>

    </div>
  `,
})
export class TripsComponent {
  readonly router     = inject(Router);
  private tripService = inject(TripService);
  readonly trips      = this.tripService.trips;
  readonly isLoading  = this.tripService.isLoading;

  readonly totalExpenses = computed(() => this.trips().reduce((s, t) => s + t.expenses.length, 0));
  readonly totalAmount   = computed(() => this.trips().reduce((s, t) => s + this.tripTotal(t), 0));

  tripTotal(trip: Trip): number {
    return trip.expenses.reduce((s, e) => s + e.amount, 0);
  }

  settledCount(trip: Trip): number {
    return trip.settlements.filter(s => s.paid).length;
  }

  deleteTrip(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('Delete this trip?')) this.tripService.deleteTrip(id);
  }
}
