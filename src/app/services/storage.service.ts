import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Group } from '../models/group.model';
import { Trip } from '../models/trip.model';

class AppDb extends Dexie {
  groups!: Table<Group, string>;
  trips!:  Table<Trip,  string>;

  constructor() {
    super('SplitKaroDB');
    this.version(1).stores({ groups: 'id, name, createdAt' });
    this.version(2).stores({ groups: 'id, name, createdAt', trips: 'id, name, createdAt' });
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
}
