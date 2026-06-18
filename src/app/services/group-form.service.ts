import { Injectable, signal } from '@angular/core';
import { FormState, Member, ExpenseConfig } from '../models/group.model';
import { nanoid } from '../utils/formatters';

const defaultExpenses: ExpenseConfig = {
  rentAmount: 0,
  rationAmount: 0,
  vegetableAmount: 0,
  splitMode: 'equal',
  extraItems: [],
};

const defaultState: FormState = {
  step: 1,
  groupName: '',
  fromDate: '',
  toDate: '',
  expenses: { ...defaultExpenses },
  members: [],
};

@Injectable({ providedIn: 'root' })
export class GroupFormService {
  readonly form = signal<FormState>({ ...defaultState, expenses: { ...defaultExpenses } });

  reset(): void {
    this.form.set({ ...defaultState, expenses: { ...defaultExpenses }, members: [] });
  }

  // Seed a new split from a roster: members prefilled (fresh ids, days/paid reset),
  // name = roster name. Amounts/dates start blank.
  seedFromRoster(groupName: string, rosterMembers: Member[]): void {
    this.form.set({
      ...defaultState,
      groupName,
      expenses: { ...defaultExpenses, extraItems: [] },
      members: rosterMembers.map(m => ({
        id: nanoid(),
        name: m.name,
        upiId: m.upiId ?? '',
        includeRationVeg: m.includeRationVeg,
        daysPresent: 15,
        personalExpensePaid: 0,
      })),
    });
  }

  setStep(step: 1 | 2 | 3 | 4): void {
    this.form.update(f => ({ ...f, step }));
  }

  setGroupInfo(groupName: string, fromDate: string, toDate: string): void {
    this.form.update(f => ({ ...f, groupName, fromDate, toDate }));
  }

  setExpenses(expenses: ExpenseConfig): void {
    this.form.update(f => ({ ...f, expenses }));
  }

  addMember(): void {
    const newMember: Member = {
      id: nanoid(),
      name: '',
      daysPresent: 15,
      includeRationVeg: true,
      personalExpensePaid: 0,
      upiId: '',
    };
    this.form.update(f => ({ ...f, members: [...f.members, newMember] }));
  }

  updateMember(id: string, patch: Partial<Member>): void {
    this.form.update(f => ({
      ...f,
      members: f.members.map(m => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }

  removeMember(id: string): void {
    this.form.update(f => ({ ...f, members: f.members.filter(m => m.id !== id) }));
  }
}
