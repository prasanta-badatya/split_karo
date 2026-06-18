import { Injectable } from '@angular/core';
import qrcode from 'qrcode-generator';

declare global {
  interface Navigator {
    canShare(data?: { files?: File[]; text?: string; title?: string; url?: string }): boolean;
  }
}

const INK   = '#111827';   // QR dark modules (gray-900)
const PAPER = '#ffffff';
const BRAND = '#4f46e5';   // indigo-600
const GRAY  = '#6b7280';

/**
 * Renders UPI `upi://pay` payloads to QR (canvas / data-URL) and shares a branded
 * "scan to pay" card image via the Web Share API. Pure client-side, no network.
 */
@Injectable({ providedIn: 'root' })
export class QrService {

  /** Draw `data` as a QR onto a fresh canvas, ~`sizePx` CSS px square, retina-aware. */
  toCanvas(data: string, sizePx = 320, margin = 4): HTMLCanvasElement {
    const qr = qrcode(0, 'M');           // auto type number, medium error correction
    qr.addData(data);
    qr.make();

    const count = qr.getModuleCount();
    const cell  = Math.max(1, Math.floor(sizePx / (count + margin * 2)));
    const dim   = cell * (count + margin * 2);
    const dpr   = Math.min(window.devicePixelRatio || 1, 3);

    const canvas  = document.createElement('canvas');
    canvas.width  = dim * dpr;
    canvas.height = dim * dpr;
    canvas.style.width  = dim + 'px';
    canvas.style.height = dim + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = INK;
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
        }
      }
    }
    return canvas;
  }

  /** PNG data-URL of the bare QR, for an <img> src. */
  toDataUrl(data: string, sizePx = 320): string {
    return this.toCanvas(data, sizePx).toDataURL('image/png');
  }

  /**
   * Share (or download as fallback) a branded card: title, payee, amount, QR.
   * `qrData` is the `upi://pay` string the QR encodes; `caption` rides along as
   * share text (e.g. the https pay link).
   */
  async sharePayCard(opts: {
    qrData: string; payeeName: string; amountLabel: string; caption?: string;
  }): Promise<void> {
    const blob = await this.buildCardBlob(opts);
    const file = new File([blob], `pay-${opts.payeeName || 'request'}.png`, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Split Karo — Scan to pay',
          text:  opts.caption || `Pay ${opts.payeeName} ${opts.amountLabel}`,
        });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      }
    }
    this.download(blob, file.name);
  }

  // ─── Card composition ──────────────────────────────────────────────────────
  private buildCardBlob(opts: { qrData: string; payeeName: string; amountLabel: string }): Promise<Blob> {
    const W = 600, H = 760, PAD = 40, QR_SIZE = 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const canvas  = document.createElement('canvas');
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // background
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // header
    ctx.textAlign = 'center';
    ctx.fillStyle = BRAND;
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.fillText('Scan to pay', W / 2, 64);

    ctx.fillStyle = INK;
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(opts.payeeName || 'Payee', W / 2, 104);

    ctx.fillStyle = BRAND;
    ctx.font = '700 40px Inter, system-ui, sans-serif';
    ctx.fillText(opts.amountLabel, W / 2, 156);

    // QR (re-render at exact px, no DPR double-scale — draw the bare canvas in)
    const qr = this.toCanvas(opts.qrData, QR_SIZE, 2);
    const qx = (W - QR_SIZE) / 2;
    const qy = 192;
    ctx.drawImage(qr, qx, qy, QR_SIZE, QR_SIZE);

    // footer
    ctx.fillStyle = GRAY;
    ctx.font = '500 18px Inter, system-ui, sans-serif';
    ctx.fillText('Any UPI app · GPay · PhonePe · Paytm', W / 2, qy + QR_SIZE + 48);
    ctx.fillStyle = BRAND;
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.fillText('Split Karo', W / 2, qy + QR_SIZE + 80);

    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 0.95));
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
