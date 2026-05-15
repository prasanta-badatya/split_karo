import { Injectable, signal } from '@angular/core';
import { FormState, Member, ExpenseConfig } from '../models/group.model';
import { nanoid } from '../utils/formatters';

const defaultExpenses: ExpenseConfig = {
  rentAmount: 0,
  rationAmount: 0,
  vegetableAmount: 0,
  rationSplitMode: 'equal',
  vegetableSplitMode: 'equal',
};

const defaultState: FormState = {
  step: 1,
  groupName: '',
  cycleLabel: '',
  expenses: { ...defaultExpenses },
  members: [],
};

@Injectable({ providedIn: 'root' })
export class GroupFormService {
  readonly form = signal<FormState>({ ...defaultState, expenses: { ...defaultExpenses } });

  reset(): void {
    this.form.set({ ...defaultState, expenses: { ...defaultExpenses }, members: [] });
  }

  setStep(step: 1 | 2 | 3 | 4): void {
    this.form.update(f => ({ ...f, step }));
  }

  setGroupInfo(groupName: string, cycleLabel: string): void {
    this.form.update(f => ({ ...f, groupName, cycleLabel }));
  }

  setExpenses(expenses: ExpenseConfig): void {
    this.form.update(f => ({ ...f, expenses }));
  }

  addMember(): void {
    const newMember: Member = {
      id: nanoid(),
      name: '',
      daysPresent: 15,
      includeRation: true,
      includeVegetable: true,
      personalExpensePaid: 0,
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
