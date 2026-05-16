import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Group } from '../models/group.model';

class AppDb extends Dexie {
  groups!: Table<Group, string>;

  constructor() {
    super('SplitKaroDB');
    // Version 1: index id (PK), name, and createdAt for sorting
    this.version(1).stores({
      groups: 'id, name, createdAt',
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
}
