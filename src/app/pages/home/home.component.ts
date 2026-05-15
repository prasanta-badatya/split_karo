import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-brand-500 text-white px-4 py-5 shadow-md">
        <h1 class="text-2xl font-bold">Split Karo 💰</h1>
        <p class="text-brand-100 text-sm mt-1">Bachelor expense calculator</p>
      </div>

      <!-- Content -->
      <div class="max-w-2xl mx-auto px-4 py-6">
        <ng-container *ngIf="groups().length === 0; else groupList">
          <!-- Empty State -->
          <div class="text-center py-20">
            <div class="text-6xl mb-4">📒</div>
            <h2 class="text-xl font-semibold text-gray-700">No groups yet</h2>
            <p class="text-gray-400 mt-2 text-sm">Create your first expense group</p>
            <button (click)="goToNew()"
              class="mt-6 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-8 py-3 rounded-xl shadow transition-colors">
              + New Group
            </button>
          </div>
        </ng-container>

        <ng-template #groupList>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-700">Your Groups</h2>
            <button (click)="goToNew()"
              class="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow transition-colors">
              + New
            </button>
          </div>

          <div class="space-y-3">
            <div *ngFor="let group of groups()"
              (click)="viewGroup(group.id)"
              class="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-100">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-semibold text-gray-800">{{ group.name }}</h3>
                  <p class="text-gray-400 text-xs mt-1">{{ group.cycleLabel }}</p>
                  <p class="text-gray-500 text-sm mt-2">{{ group.members.length }} members</p>
                </div>
                <div class="text-right">
                  <p class="text-brand-500 font-bold text-lg">₹{{ group.result.grandTotal | number }}</p>
                  <p class="text-gray-400 text-xs">Total</p>
                </div>
              </div>
              <div class="flex justify-end mt-3">
                <button (click)="deleteGroup($event, group.id)"
                  class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class HomeComponent {
  private router = inject(Router);
  private groupService = inject(GroupService);
  readonly groups = this.groupService.groups;

  goToNew(): void {
    this.router.navigate(['/new']);
  }

  viewGroup(id: string): void {
    this.router.navigate(['/group', id]);
  }

  deleteGroup(event: Event, id: string): void {
    event.stopPropagation();
    if (confirm('Delete this group?')) {
      this.groupService.deleteGroup(id);
    }
  }
}
