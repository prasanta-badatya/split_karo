import { Injectable, signal, computed } from '@angular/core';
import { Trip, Settlement } from '../models/trip.model';
import { StorageService } from './storage.service';
import { calculateSettlements } from '../utils/trip-calculator';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly _trips = signal<Trip[]>([]);
  readonly trips     = computed(() => [...this._trips()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly isLoading = signal(true);

  constructor(private storage: StorageService) {
    this.init();
  }

  private async init(): Promise<void> {
    this._trips.set(await this.storage.loadTrips());
    this.isLoading.set(false);
  }

  async addTrip(trip: Trip): Promise<void> {
    await this.storage.saveTrip(trip);
    this._trips.update(ts => [...ts, trip]);
  }

  async deleteTrip(id: string): Promise<void> {
    await this.storage.deleteTrip(id);
    this._trips.update(ts => ts.filter(t => t.id !== id));
  }

  getTrip(id: string): Trip | undefined {
    return this._trips().find(t => t.id === id);
  }

  async reload(): Promise<void> {
    this._trips.set(await this.storage.loadTrips());
  }

  /** Persist edits to a trip's expenses/members and re-derive its settlement plan. */
  async updateTrip(trip: Trip): Promise<void> {
    const settlements = calculateSettlements(trip.members, trip.expenses);
    const updated: Trip = { ...trip, settlements };
    await this.storage.saveTrip(updated);
    this._trips.update(ts => ts.map(t => t.id === updated.id ? updated : t));
  }

  async toggleSettlementPaid(tripId: string, index: number): Promise<void> {
    const trip = this._trips().find(t => t.id === tripId);
    if (!trip) return;
    const settlements: Settlement[] = trip.settlements.map((s, i) =>
      i === index ? { ...s, paid: !s.paid } : s,
    );
    const updated: Trip = { ...trip, settlements };
    await this.storage.saveTrip(updated);
    this._trips.update(ts => ts.map(t => t.id === tripId ? updated : t));
  }
}
