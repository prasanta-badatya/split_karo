import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';
import { QrService } from '../../services/qr.service';
import { UpiRequest, buildUpiUriFrom, buildUpiPayLink } from '../../utils/upi';

/**
 * Bottom-sheet modal: shows a UPI "scan to pay" QR for one collect request, plus
 * actions to open a UPI app (deep-link), copy a shareable https pay link, and
 * share the QR card image (WhatsApp etc.). Drop in with:
 *   <app-pay-qr *ngIf="payReq() as r" [req]="r" (closed)="payReq.set(null)" />
 */
@Component({
  selector: 'app-pay-qr',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closed.emit()"></div>

      <div class="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto p-5 text-center"
        style="animation: sheetUp 0.25s cubic-bezier(.32,.72,0,1)">

        <button (click)="closed.emit()"
          class="absolute top-3 right-3 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <app-icon name="x" class="w-5 h-5"></app-icon>
        </button>

        <h3 class="text-base font-bold text-brand-600 mb-0.5">Scan to pay</h3>
        <p class="text-sm font-semibold text-gray-900">{{ req.name }}</p>
        <p class="text-2xl font-extrabold text-brand-600 mb-3">₹{{ req.amount | number:'1.0-2' }}</p>

        <div class="inline-block rounded-2xl border border-gray-100 p-3 shadow-sm bg-white">
          <img [src]="qrDataUrl()" alt="UPI QR code" width="240" height="240" class="block w-60 h-60" />
        </div>

        <p class="text-xs text-gray-400 mt-2 mb-1">{{ req.vpa }}</p>
        <p *ngIf="req.note" class="text-xs text-gray-400 mb-3 truncate">“{{ req.note }}”</p>

        <div class="space-y-2 mt-4">
          <a [href]="upiUri()"
            class="flex sm:hidden items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors">
            💸 Open UPI app
          </a>

          <button (click)="share()"
            class="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-500 sm:bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-colors">
            <app-icon name="share" class="w-4 h-4"></app-icon> Share QR
          </button>

          <button (click)="copyLink()"
            class="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
            <app-icon [name]="copied() ? 'check' : 'link'" class="w-4 h-4"></app-icon>
            {{ copied() ? 'Link copied!' : 'Copy pay link' }}
          </button>
        </div>

        <p class="text-[11px] text-gray-400 mt-3">Works with any UPI app · GPay · PhonePe · Paytm</p>
      </div>
    </div>
  `,
})
export class PayQrComponent {
  private _req!: UpiRequest;
  @Input({ required: true }) set req(value: UpiRequest) {
    this._req = value;
    this.qrDataUrl.set(this.qr.toDataUrl(buildUpiUriFrom(value), 480));
  }
  get req(): UpiRequest { return this._req; }

  @Output() closed = new EventEmitter<void>();

  readonly qrDataUrl = signal<string>('');
  readonly copied = signal(false);

  readonly upiUri  = computed(() => buildUpiUriFrom(this._req));
  readonly payLink = computed(() => buildUpiPayLink(this._req));

  constructor(private qr: QrService) {}

  async share(): Promise<void> {
    await this.qr.sharePayCard({
      qrData:      this.upiUri(),
      payeeName:   this._req.name,
      amountLabel: `₹${(Math.round(this._req.amount * 100) / 100).toFixed(2)}`,
      caption:     this.payLink() || undefined,
    });
  }

  async copyLink(): Promise<void> {
    const link = this.payLink();
    if (!link) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        this.copyViaTextarea(link);
      }
      this.flashCopied();
    } catch {
      this.copyViaTextarea(link);
      this.flashCopied();
    }
  }

  private flashCopied(): void {
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  // Clipboard fallback for insecure contexts (http LAN) — copies directly, no prompt.
  private copyViaTextarea(text: string): void {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
}
