import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { Group } from '../../models/group.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-brand-500 text-white px-4 py-4 shadow-md flex items-center gap-3">
        <button (click)="goBack()" class="text-white text-xl font-bold">←</button>
        <div class="flex-1">
          <h1 class="text-lg font-bold">{{ group()?.name }}</h1>
          <p class="text-brand-100 text-xs">{{ group()?.cycleLabel }}</p>
        </div>
        <button (click)="share()" class="text-brand-100 text-sm border border-brand-300 px-3 py-1.5 rounded-xl">
          Share
        </button>
      </div>

      <div *ngIf="group() as g" class="max-w-2xl mx-auto px-4 py-6">
        <!-- Summary Banner -->
        <div class="bg-brand-500 text-white rounded-2xl p-4 mb-6 shadow">
          <div class="grid grid-cols-3 gap-3 text-center text-sm mb-3">
            <div>
              <p class="text-brand-100 text-xs">Room Rent</p>
              <p class="font-bold">{{ fmt(g.result.totalRent) }}</p>
            </div>
            <div>
              <p class="text-brand-100 text-xs">Ration</p>
              <p class="font-bold">{{ fmt(g.result.totalRation) }}</p>
            </div>
            <div>
              <p class="text-brand-100 text-xs">Vegetable</p>
              <p class="font-bold">{{ fmt(g.result.totalVegetable) }}</p>
            </div>
          </div>
          <div class="border-t border-brand-400 pt-3 text-center">
            <p class="text-brand-100 text-xs">Grand Total</p>
            <p class="text-2xl font-bold">{{ fmt(g.result.grandTotal) }}</p>
          </div>
        </div>

        <!-- Per Person -->
        <div class="space-y-3">
          <div *ngFor="let share of g.result.shares"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-gray-800 text-lg">{{ share.memberName }}</h3>
              <span class="font-bold text-xl"
                [class.text-brand-500]="share.total >= 0"
                [class.text-green-600]="share.total < 0">
                {{ share.total < 0 ? 'Gets back ' : 'Pays ' }}{{ fmt(share.total) }}
              </span>
            </div>
            <div class="text-sm text-gray-500 space-y-1">
              <div class="flex justify-between">
                <span>🏠 Room Rent</span><span>{{ fmt(share.rentShare) }}</span>
              </div>
              <div *ngIf="share.rationShare > 0" class="flex justify-between">
                <span>🛒 Ration</span><span>{{ fmt(share.rationShare) }}</span>
              </div>
              <div *ngIf="share.vegetableShare > 0" class="flex justify-between">
                <span>🥦 Vegetable</span><span>{{ fmt(share.vegetableShare) }}</span>
              </div>
              <div *ngIf="share.personalExpensePaid > 0" class="flex justify-between text-green-600">
                <span>✅ Already Paid</span><span>− {{ fmt(share.personalExpensePaid) }}</span>
              </div>
              <div class="border-t border-gray-100 pt-1 flex justify-between font-semibold text-gray-700">
                <span>Total</span>
                <span [class.text-red-500]="share.total < 0">{{ fmt(share.total) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!group()" class="text-center py-20 text-gray-400">
        <p>Group not found.</p>
        <button (click)="goBack()" class="mt-4 text-brand-500 underline">Go back</button>
      </div>
    </div>
  `
})
export class GroupDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private groupService = inject(GroupService);

  readonly fmt = formatCurrency;
  readonly group = signal<Group | undefined>(undefined);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.group.set(this.groupService.getGroup(id));
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  share(): void {
    const g = this.group();
    if (!g) return;
    const lines = [
      `*Split Karo - ${g.name}*`,
      `Period: ${g.cycleLabel}`,
      ``,
      `Expenses:`,
      `  Room Rent:  ₹${g.result.totalRent}`,
      `  Ration:     ₹${g.result.totalRation}`,
      `  Vegetable:  ₹${g.result.totalVegetable}`,
      `  Total:      ₹${g.result.grandTotal}`,
      ``,
      `Breakdown:`,
      ...g.result.shares.map(s =>
        `  ${s.memberName}: ${s.total < 0 ? 'Gets ₹' + Math.abs(s.total) : 'Pays ₹' + s.total}`
      ),
      ``,
      `Generated by Split Karo`
    ];
    const text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
    }
  }
}
