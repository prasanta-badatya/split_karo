import { Injectable, signal, computed } from '@angular/core';
import { Group } from '../models/group.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly _groups = signal<Group[]>([]);
  readonly groups = computed(() => [...this._groups()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  constructor(private storage: StorageService) {
    this._groups.set(this.storage.loadGroups());
  }

  addGroup(group: Group): void {
    this._groups.update(gs => [...gs, group]);
    this.storage.saveGroups(this._groups());
  }

  deleteGroup(id: string): void {
    this._groups.update(gs => gs.filter(g => g.id !== id));
    this.storage.saveGroups(this._groups());
  }

  getGroup(id: string): Group | undefined {
    return this._groups().find(g => g.id === id);
  }
}
