import { Injectable } from '@angular/core';
import { Group } from '../models/group.model';

const KEY = 'split_karo_groups';

@Injectable({ providedIn: 'root' })
export class StorageService {
  loadGroups(): Group[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveGroups(groups: Group[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch (e) {
      console.error('localStorage save failed', e);
    }
  }
}
