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

  // All splits belonging to a roster, newest first.
  groupsForRoster(rosterId: string): Group[] {
    return this._groups()
      .filter(g => g.rosterId === rosterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async reload(): Promise<void> {
    this._groups.set(await this.storage.loadGroups());
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    const group = this._groups().find(g => g.id === id);
    if (!group) return;
    const updated: Group = { ...group, archived };
    await this.storage.saveGroup(updated);
    this._groups.update(gs => gs.map(g => g.id === id ? updated : g));
  }

  async updateGroup(group: Group): Promise<void> {
    await this.storage.saveGroup(group);
    this._groups.update(gs => gs.map(g => g.id === group.id ? group : g));
  }

  async toggleMemberPaid(groupId: string, memberId: string): Promise<void> {
    const group = this._groups().find(g => g.id === groupId);
    if (!group) return;
    const paid = { ...(group.paidMembers ?? {}) };
    paid[memberId] = !paid[memberId];
    const updated: Group = { ...group, paidMembers: paid };
    await this.storage.saveGroup(updated);
    this._groups.update(gs => gs.map(g => g.id === groupId ? updated : g));
  }

  /** Amount received so far for a member, honouring the legacy boolean flag. */
  static amountPaidFor(group: Group, memberId: string, owed: number): number {
    const explicit = group.paidAmounts?.[memberId];
    if (explicit != null) return explicit;
    return group.paidMembers?.[memberId] && owed > 0 ? owed : 0; // old "fully paid"
  }

  /** Record the cumulative amount a member has paid this cycle (0 clears it). */
  async setMemberPaidAmount(groupId: string, memberId: string, amount: number): Promise<void> {
    const group = this._groups().find(g => g.id === groupId);
    if (!group) return;
    const amounts = { ...(group.paidAmounts ?? {}) };
    if (amount > 0.001) amounts[memberId] = Math.round(amount * 100) / 100;
    else delete amounts[memberId];
    // drop any stale legacy flag for this member so there's a single source of truth
    const paidMembers = { ...(group.paidMembers ?? {}) };
    delete paidMembers[memberId];
    const updated: Group = { ...group, paidAmounts: amounts, paidMembers };
    await this.storage.saveGroup(updated);
    this._groups.update(gs => gs.map(g => g.id === groupId ? updated : g));
  }

  /**
   * Unpaid dues to carry into a roster's next cycle, keyed by lowercased member
   * name (member ids are regenerated each cycle, so name is the stable match).
   * Only positive remaining debts are carried; advances/credits are ignored.
   */
  previousDuesForRoster(rosterId: string): Record<string, number> {
    const prev = this.groupsForRoster(rosterId)[0]; // newest existing cycle
    const map: Record<string, number> = {};
    if (!prev) return map;
    for (const s of prev.result.shares) {
      const owed = s.total;
      if (owed <= 0.01) continue;
      const due = owed - GroupService.amountPaidFor(prev, s.memberId, owed);
      if (due > 0.01) map[s.memberName.trim().toLowerCase()] = Math.round(due * 100) / 100;
    }
    return map;
  }
}
