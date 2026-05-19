import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GroupService } from '../../services/group.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-white flex flex-col">

      <!-- ═══ NAVBAR ═══ -->
      <header class="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div class="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <span class="text-white font-bold text-sm tracking-tight">SK</span>
            </div>
            <span class="text-base font-bold text-gray-900">Split Karo</span>
          </div>
          <div class="flex items-center gap-2">
            <button *ngIf="!isLoading() && groups().length > 0" (click)="goToGroups()"
              class="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-600 font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
              My Groups
              <span class="bg-brand-100 text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{{ groups().length }}</span>
            </button>
            <button (click)="goToNew()"
              class="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
              + New Group
            </button>
          </div>
        </div>
      </header>

      <!-- ═══ LOADING (IndexedDB initialising) ═══ -->
      <div *ngIf="isLoading()" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
          <p class="text-sm font-medium text-gray-400">Loading your groups…</p>
        </div>
      </div>

      <!-- ═══ HERO (always full screen) ═══ -->
      <ng-container *ngIf="!isLoading()">
        <section class="flex-1 flex items-center bg-gradient-to-br from-white via-brand-50 to-indigo-50 overflow-hidden">
          <div class="max-w-6xl mx-auto px-4 sm:px-8 w-full py-12 lg:py-0">
            <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

              <!-- Left: Text Content -->
              <div class="text-center lg:text-left">
                <!-- Badge -->
                <div class="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 anim-fade-up">
                  <span class="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                  Smart Expense Splitter
                </div>

                <!-- Headline -->
                <h1 class="text-4xl sm:text-5xl lg:text-[52px] font-bold text-gray-900 leading-tight mb-4 anim-fade-up anim-d1">
                  Split bills,<br/>
                  <span class="text-brand-500">stress-free.</span>
                </h1>

                <!-- Quote -->
                <p class="text-lg text-gray-500 font-medium mb-6 anim-fade-up anim-d2">
                  "No more awkward money conversations<br class="hidden sm:block"/> with your roommates."
                </p>

                <!-- Feature chips -->
                <div class="flex flex-wrap gap-2 justify-center lg:justify-start mb-8 anim-fade-up anim-d3">
                  <span class="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">🏠 Room Rent</span>
                  <span class="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">🛒 Ration</span>
                  <span class="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">🥦 Vegetables</span>
                  <span class="flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">📅 Day-wise split</span>
                </div>

                <!-- CTA -->
                <div class="anim-fade-up anim-d4">
                  <div class="flex flex-wrap gap-3 justify-center lg:justify-start">
                    <button (click)="goToNew()"
                      class="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-xl text-base shadow-lg hover:shadow-brand-200 hover:shadow-xl transition-all duration-200 active:scale-95">
                      <span class="text-lg leading-none">+</span>
                      {{ groups().length === 0 ? 'Create Your First Group' : 'New Group' }}
                    </button>
                    <button *ngIf="groups().length > 0" (click)="goToGroups()"
                      class="inline-flex items-center gap-2 bg-white border-2 border-brand-200 hover:border-brand-400 hover:bg-brand-50 text-brand-600 font-bold px-8 py-4 rounded-xl text-base transition-all duration-200 active:scale-95">
                      My Groups
                      <span class="bg-brand-100 text-brand-700 text-sm font-bold px-2 py-0.5 rounded-full">{{ groups().length }}</span>
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-3 font-medium">Free · No signup required · Works offline</p>
                </div>
              </div>

              <!-- Right: SVG Illustration -->
              <div class="flex justify-center anim-fade-right anim-d2">
                <div class="anim-float w-full max-w-md">
                  <svg viewBox="0 0 480 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="cs" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#6366f1" flood-opacity="0.14"/>
                      </filter>
                      <filter id="xs" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#6366f1" flood-opacity="0.10"/>
                      </filter>
                    </defs>

                    <!-- Background blobs -->
                    <ellipse cx="285" cy="215" rx="185" ry="180" fill="#eef2ff"/>
                    <circle cx="145" cy="110" r="75" fill="#e0e7ff" opacity="0.45"/>
                    <circle cx="400" cy="330" r="55" fill="#c7d2fe" opacity="0.25"/>

                    <!-- Floating person chip — left (Amit) -->
                    <rect x="10" y="158" width="118" height="56" rx="14" fill="white" filter="url(#xs)"/>
                    <circle cx="34" cy="186" r="14" fill="#eef2ff"/>
                    <text x="34" y="191" text-anchor="middle" fill="#6366f1" font-size="10" font-weight="700" font-family="Inter,sans-serif">AM</text>
                    <text x="83" y="180" text-anchor="middle" fill="#6b7280" font-size="10" font-family="Inter,sans-serif">Amit</text>
                    <text x="83" y="197" text-anchor="middle" fill="#6366f1" font-size="13" font-weight="700" font-family="Inter,sans-serif">₹4,125</text>
                    <rect x="62" y="203" width="42" height="5" rx="2.5" fill="#e0e7ff"/>

                    <!-- Floating person chip — right (Rahul) -->
                    <rect x="352" y="158" width="118" height="56" rx="14" fill="white" filter="url(#xs)"/>
                    <circle cx="376" cy="186" r="14" fill="#ede9fe"/>
                    <text x="376" y="191" text-anchor="middle" fill="#7c3aed" font-size="10" font-weight="700" font-family="Inter,sans-serif">RJ</text>
                    <text x="421" y="180" text-anchor="middle" fill="#6b7280" font-size="10" font-family="Inter,sans-serif">Rahul</text>
                    <text x="421" y="197" text-anchor="middle" fill="#4f46e5" font-size="13" font-weight="700" font-family="Inter,sans-serif">₹4,125</text>
                    <rect x="400" y="203" width="42" height="5" rx="2.5" fill="#c7d2fe"/>

                    <!-- Main receipt card -->
                    <rect x="126" y="52" width="228" height="272" rx="20" fill="white" filter="url(#cs)"/>

                    <!-- Card header -->
                    <rect x="126" y="52" width="228" height="64" rx="20" fill="#6366f1"/>
                    <rect x="126" y="96" width="228" height="20" fill="#6366f1"/>
                    <text x="240" y="79" text-anchor="middle" fill="white" font-size="11" font-family="Inter,sans-serif" opacity="0.75">Room 5 · May 2026</text>
                    <text x="240" y="101" text-anchor="middle" fill="white" font-size="15" font-weight="700" font-family="Inter,sans-serif">Expense Summary</text>

                    <!-- Expense rows -->
                    <text x="150" y="142" fill="#9ca3af" font-size="11" font-family="Inter,sans-serif">🏠 Room Rent</text>
                    <text x="336" y="142" text-anchor="end" fill="#374151" font-size="11" font-weight="600" font-family="Inter,sans-serif">₹12,000</text>

                    <text x="150" y="166" fill="#9ca3af" font-size="11" font-family="Inter,sans-serif">🛒 Ration</text>
                    <text x="336" y="166" text-anchor="end" fill="#374151" font-size="11" font-weight="600" font-family="Inter,sans-serif">₹3,000</text>

                    <text x="150" y="190" fill="#9ca3af" font-size="11" font-family="Inter,sans-serif">🥦 Vegetable</text>
                    <text x="336" y="190" text-anchor="end" fill="#374151" font-size="11" font-weight="600" font-family="Inter,sans-serif">₹1,500</text>

                    <!-- Divider -->
                    <line x1="146" y1="208" x2="334" y2="208" stroke="#f1f5f9" stroke-width="1.5"/>

                    <!-- Total -->
                    <text x="150" y="232" fill="#374151" font-size="12" font-weight="600" font-family="Inter,sans-serif">Grand Total</text>
                    <text x="336" y="232" text-anchor="end" fill="#6366f1" font-size="16" font-weight="700" font-family="Inter,sans-serif">₹16,500</text>

                    <!-- Split badge inside card -->
                    <rect x="148" y="248" width="184" height="56" rx="12" fill="#eef2ff"/>
                    <text x="240" y="268" text-anchor="middle" fill="#6366f1" font-size="11" font-family="Inter,sans-serif">Split among 4 members</text>
                    <text x="240" y="289" text-anchor="middle" fill="#4f46e5" font-size="14" font-weight="700" font-family="Inter,sans-serif">₹4,125 each  ÷</text>

                    <!-- Floating expense tags outside card -->
                    <rect x="356" y="60" width="72" height="26" rx="13" fill="#6366f1"/>
                    <text x="392" y="77" text-anchor="middle" fill="white" font-size="10" font-weight="600" font-family="Inter,sans-serif">🏠 Rent</text>

                    <rect x="10" y="290" width="86" height="26" rx="13" fill="#818cf8"/>
                    <text x="53" y="307" text-anchor="middle" fill="white" font-size="10" font-weight="600" font-family="Inter,sans-serif">🛒 Ration</text>

                    <rect x="360" y="340" width="96" height="26" rx="13" fill="#4f46e5"/>
                    <text x="408" y="357" text-anchor="middle" fill="white" font-size="10" font-weight="600" font-family="Inter,sans-serif">🥦 Vegetable</text>

                    <!-- Decorative dots -->
                    <circle cx="80" cy="76" r="9" fill="#818cf8" opacity="0.28"/>
                    <circle cx="430" cy="118" r="7" fill="#6366f1" opacity="0.20"/>
                    <circle cx="52" cy="356" r="8" fill="#818cf8" opacity="0.22"/>
                    <circle cx="240" cy="36" r="5" fill="#6366f1" opacity="0.30"/>
                    <circle cx="440" cy="270" r="10" fill="#4f46e5" opacity="0.15"/>
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </section>
      </ng-container>

    </div>
  `
})
export class HomeComponent {
  private router = inject(Router);
  private groupService = inject(GroupService);
  readonly groups    = this.groupService.groups;
  readonly isLoading = this.groupService.isLoading;

  goToNew(): void { this.router.navigate(['/new']); }
  goToGroups(): void { this.router.navigate(['/groups']); }
}
