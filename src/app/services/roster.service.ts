import { Injectable, signal, computed } from '@angular/core';
import { Roster } from '../models/group.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class RosterService {
  private readonly _rosters = signal<Roster[]>([]);
  readonly rosters   = computed(() => [...this._rosters()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly isLoading = signal(true);

  constructor(private storage: StorageService) {
    this.init();
  }

  private async init(): Promise<void> {
    this._rosters.set(await this.storage.loadRosters());
    this.isLoading.set(false);
  }

  getRoster(id: string): Roster | undefined {
    return this._rosters().find(r => r.id === id);
  }

  async addRoster(roster: Roster): Promise<void> {
    await this.storage.saveRoster(roster);
    this._rosters.update(rs => [...rs, roster]);
  }

  async updateRoster(roster: Roster): Promise<void> {
    await this.storage.saveRoster(roster);
    this._rosters.update(rs => rs.map(r => r.id === roster.id ? roster : r));
  }

  // Cascade: deleting a roster removes all its splits too.
  async deleteRoster(id: string): Promise<void> {
    await this.storage.deleteGroupsForRoster(id);
    await this.storage.deleteRoster(id);
    this._rosters.update(rs => rs.filter(r => r.id !== id));
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    const roster = this.getRoster(id);
    if (!roster) return;
    const updated: Roster = { ...roster, archived };
    await this.storage.saveRoster(updated);
    this._rosters.update(rs => rs.map(r => r.id === id ? updated : r));
  }
}
