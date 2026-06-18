import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Group, Roster } from '../models/group.model';
import { Trip } from '../models/trip.model';

class AppDb extends Dexie {
  groups!:  Table<Group,  string>;
  trips!:   Table<Trip,   string>;
  rosters!: Table<Roster, string>;

  constructor() {
    super('SplitKaroDB');
    this.version(1).stores({ groups: 'id, name, createdAt' });
    this.version(2).stores({ groups: 'id, name, createdAt', trips: 'id, name, createdAt' });
    // v3: rosters (persistent groups) + index splits by rosterId
    this.version(3).stores({
      groups:  'id, name, createdAt, rosterId',
      trips:   'id, name, createdAt',
      rosters: 'id, name, createdAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly db = new AppDb();

  async loadGroups(): Promise<Group[]> {
    return this.db.groups.orderBy('createdAt').reverse().toArray();
  }

  async saveGroup(group: Group): Promise<void> {
    await this.db.groups.put(group);
  }

  async deleteGroup(id: string): Promise<void> {
    await this.db.groups.delete(id);
  }

  async bulkSave(groups: Group[]): Promise<void> {
    await this.db.groups.bulkPut(groups);
  }

  async loadTrips(): Promise<Trip[]> {
    return this.db.trips.orderBy('createdAt').reverse().toArray();
  }

  async saveTrip(trip: Trip): Promise<void> {
    await this.db.trips.put(trip);
  }

  async deleteTrip(id: string): Promise<void> {
    await this.db.trips.delete(id);
  }

  async bulkSaveTrips(trips: Trip[]): Promise<void> {
    await this.db.trips.bulkPut(trips);
  }

  // ─── Rosters ───────────────────────────────────────────────
  async loadRosters(): Promise<Roster[]> {
    return this.db.rosters.orderBy('createdAt').reverse().toArray();
  }

  async saveRoster(roster: Roster): Promise<void> {
    await this.db.rosters.put(roster);
  }

  async deleteRoster(id: string): Promise<void> {
    await this.db.rosters.delete(id);
  }

  // Splits (groups) belonging to a roster
  async loadGroupsForRoster(rosterId: string): Promise<Group[]> {
    return this.db.groups.where('rosterId').equals(rosterId).toArray();
  }

  async deleteGroupsForRoster(rosterId: string): Promise<void> {
    await this.db.groups.where('rosterId').equals(rosterId).delete();
  }

  async clearAll(): Promise<void> {
    await Promise.all([this.db.groups.clear(), this.db.trips.clear(), this.db.rosters.clear()]);
  }
}
