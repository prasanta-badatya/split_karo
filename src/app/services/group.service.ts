import { Injectable, signal, computed } from '@angular/core';
import { Group } from '../models/group.model';
import { StorageService } from './storage.service';

const LEGACY_KEY = 'split_karo_groups';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly _groups = signal<Group[]>([]);
  readonly groups    = computed(() => [...this._groups()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly isLoading = signal(true);

  constructor(private storage: StorageService) {
    this.init();
  }

  private async init(): Promise<void> {
    await this.migrateFromLocalStorage();
    this._groups.set(await this.storage.loadGroups());
    this.isLoading.set(false);
  }

  // One-time migration: move any existing localStorage data into IndexedDB
  private async migrateFromLocalStorage(): Promise<void> {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    try {
      const groups: Group[] = JSON.parse(raw);
      if (groups.length) await this.storage.bulkSave(groups);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
  }

  async addGroup(group: Group): Promise<void> {
    await this.storage.saveGroup(group);
    this._groups.update(gs => [...gs, group]);
  }

  async deleteGroup(id: string): Promise<void> {
    await this.storage.deleteGroup(id);
    this._groups.update(gs => gs.filter(g => g.id !== id));
  }

  getGroup(id: string): Group | undefined {
    return this._groups().find(g => g.id === id);
  }
}
