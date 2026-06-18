import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QrService } from '../../services/qr.service';

/**
 * Landing page for shared `https://…/pay?pa=…&am=…&tn=…` links. WhatsApp makes the
 * https link tappable (unlike `upi://`); this page rebuilds the `upi://pay` deep-link
 * from the query params and bounces to it, opening the visitor's UPI app pre-filled.
 * Shows a QR + manual button as fallback (desktop / iOS that blocks auto-redirect).
 */
@Component({
  selector: 'app-pay',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center px-5 py-10 text-center">
      <ng-container *ngIf="vpa(); else invalid">
        <h1 class="text-lg font-bold text-brand-600 mb-1">Opening your UPI app…</h1>
        <p class="text-sm font-semibold text-gray-900">{{ payeeName() }}</p>
        <p class="text-3xl font-extrabold text-brand-600 mb-1">₹{{ amount() | number:'1.0-2' }}</p>
        <p *ngIf="note()" class="text-xs text-gray-400 mb-5">“{{ note() }}”</p>

        <div class="inline-block rounded-2xl border border-gray-100 p-3 shadow-sm bg-white mt-3">
          <img [src]="qrDataUrl()" alt="UPI QR code" class="block w-56 h-56" />
        </div>
        <p class="text-xs text-gray-400 mt-2">{{ vpa() }}</p>

        <a [href]="upiUri()"
          class="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors">
          💸 Tap to pay
        </a>
        <p class="text-[11px] text-gray-400 mt-3 max-w-xs">
          Didn’t open? Tap the button above, or scan the QR with any UPI app
          (GPay · PhonePe · Paytm). On desktop, scan with your phone.
        </p>
      </ng-container>

      <ng-template #invalid>
        <h1 class="text-lg font-bold text-gray-900 mb-2">Invalid pay link</h1>
        <p class="text-sm text-gray-500 mb-6">This payment link is missing details.</p>
      </ng-template>

      <a routerLink="/" class="mt-8 text-xs text-brand-500 hover:text-brand-600 font-semibold">← Split Karo</a>
    </div>
  `,
})
export class PayComponent implements OnInit {
  readonly vpa       = signal('');
  readonly payeeName = signal('Payee');
  readonly amount    = signal(0);
  readonly note      = signal('');
  readonly upiUri    = signal('');
  readonly qrDataUrl = signal('');

  constructor(private route: ActivatedRoute, private qr: QrService) {}

  ngOnInit(): void {
    const p = this.route.snapshot.queryParamMap;
    const vpa = (p.get('pa') || '').trim();
    if (!vpa) return;

    this.vpa.set(vpa);
    this.payeeName.set(p.get('pn') || 'Payee');
    this.amount.set(Number(p.get('am')) || 0);
    this.note.set(p.get('tn') || '');

    // Rebuild the deep-link from the exact incoming params (preserves order/encoding).
    const params = new URLSearchParams();
    params.set('pa', vpa);
    params.set('pn', this.payeeName());
    params.set('am', (Math.round(this.amount() * 100) / 100).toFixed(2));
    params.set('cu', p.get('cu') || 'INR');
    if (this.note()) params.set('tn', this.note());
    const uri = `upi://pay?${params.toString()}`;

    this.upiUri.set(uri);
    this.qrDataUrl.set(this.qr.toDataUrl(uri, 448));

    // Auto-hand-off to the UPI app (best-effort; mobile only). Fallback button stays.
    setTimeout(() => { window.location.href = uri; }, 600);
  }
}
