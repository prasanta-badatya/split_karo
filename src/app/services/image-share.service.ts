import { Injectable } from '@angular/core';
import { Group } from '../models/group.model';

declare global {
  interface Navigator {
    canShare(data?: { files?: File[]; text?: string; title?: string; url?: string }): boolean;
  }
}

const C = {
  BRAND_500: '#6366f1',
  BRAND_600: '#4f46e5',
  BRAND_50:  '#eef2ff',
  SUCCESS:   '#10b981',
  GRAY_900:  '#111827',
  GRAY_700:  '#374151',
  GRAY_400:  '#9ca3af',
  GRAY_200:  '#e5e7eb',
  GRAY_100:  '#f3f4f6',
  GRAY_50:   '#f9fafb',
  WHITE:     '#ffffff',
};

@Injectable({ providedIn: 'root' })
export class ImageShareService {

  async generateSummaryImage(g: Group): Promise<Blob> {
    const W   = 720;
    const DPR = Math.min(window.devicePixelRatio ?? 2, 3);
    const H   = this.computeHeight(g);
    const { canvas, ctx } = this.createCanvas(W, H, DPR);

    this.drawBackground(ctx, W, H);
    this.drawHeader(ctx, g, W);
    const afterExpenses = this.drawExpenseSection(ctx, g, W);
    this.drawDivider(ctx, W, afterExpenses);
    const afterMembers = this.drawMemberSection(ctx, g, W, afterExpenses + 24);
    this.drawVerification(ctx, g, W, afterMembers + 12);
    this.drawFooter(ctx, W, H);

    return this.canvasToBlob(canvas);
  }

  async shareImage(g: Group): Promise<void> {
    const blob     = await this.generateSummaryImage(g);
    const filename = `split-karo-${g.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    const file     = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Split Karo – ${g.name}`,
          text:  `${g.name} • ${g.cycleLabel}`,
        });
        return;
      } catch (e: any) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    this.downloadBlob(blob, filename);
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  private computeHeight(g: Group): number {
    const expenseRows = 1
      + (g.result.totalRation    > 0 ? 1 : 0)
      + (g.result.totalVegetable > 0 ? 1 : 0)
      + (g.expenses.extraItems?.filter(i => i.amount > 0).length ?? 0);
    const hasPaid = g.result.shares.some(s => s.personalExpensePaid > 0);
    const rowH = 68 + (hasPaid ? 16 : 0);
    return (
      120                              // header
      + 20                             // gap below header
      + 28                             // "EXPENSES" label
      + expenseRows * 36               // expense rows
      + 44                             // grand total row
      + 36                             // average line
      + 32                             // dashed divider + gap
      + 28                             // "MEMBERS" label
      + g.result.shares.length * rowH  // member rows
      + 40                             // verification row
      + 48                             // footer
    );
  }

  private createCanvas(w: number, h: number, dpr: number) {
    const canvas    = document.createElement('canvas');
    canvas.width    = w * dpr;
    canvas.height   = h * dpr;
    const ctx       = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    return { canvas, ctx };
  }

  // ─── Drawing ───────────────────────────────────────────────────────────────

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // White card
    ctx.fillStyle = C.WHITE;
    this.roundRect(ctx, 0, 0, w, h, 20);
    ctx.fill();
    // Gray-50 body below header
    ctx.fillStyle = C.GRAY_50;
    ctx.fillRect(0, 120, w, h - 120);
  }

  private drawHeader(ctx: CanvasRenderingContext2D, g: Group, w: number): void {
    // Indigo gradient
    const grad = ctx.createLinearGradient(0, 0, w, 120);
    grad.addColorStop(0, C.BRAND_600);
    grad.addColorStop(1, C.BRAND_500);
    ctx.fillStyle = grad;
    this.roundRect(ctx, 0, 0, w, 120, { tl: 20, tr: 20, bl: 0, br: 0 });
    ctx.fill();

    // "SK" pill (left)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    this.roundRect(ctx, 32, 26, 40, 40, 12);
    ctx.fill();

    ctx.font         = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillStyle    = C.WHITE;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SK', 52, 46);

    // "Split Karo" wordmark
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font         = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillStyle    = C.WHITE;
    ctx.fillText('Split Karo', 82, 42);

    // "Expense Summary" sub-label
    ctx.font      = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.fillText('Expense Summary', 82, 62);

    // Group name (right side)
    ctx.font      = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.WHITE;
    ctx.textAlign = 'right';
    ctx.fillText(this.truncate(ctx, g.name, 320), w - 32, 44);

    // cycleLabel
    ctx.font      = '12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(this.truncate(ctx, g.cycleLabel, 320), w - 32, 66);
  }

  private drawExpenseSection(ctx: CanvasRenderingContext2D, g: Group, w: number): number {
    let y = 156;

    // Section label
    ctx.font         = '600 11px Inter, system-ui, sans-serif';
    ctx.fillStyle    = C.GRAY_400;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('EXPENSES', 40, y);
    y += 28;

    const rows: { emoji: string; label: string; amount: number }[] = [
      { emoji: '🏠', label: 'Room Rent',       amount: g.result.totalRent },
    ];
    if (g.result.totalRation    > 0) rows.push({ emoji: '🛒', label: 'Ration / Kiryana', amount: g.result.totalRation });
    if (g.result.totalVegetable > 0) rows.push({ emoji: '🥦', label: 'Vegetable',         amount: g.result.totalVegetable });
    for (const item of g.expenses.extraItems ?? []) {
      if (item.amount > 0) rows.push({ emoji: '🧾', label: item.label || 'Other', amount: item.amount });
    }

    for (const row of rows) {
      // Emoji — separate font for colour emoji
      ctx.font      = '16px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.fillStyle = C.GRAY_900;
      ctx.textAlign = 'left';
      ctx.fillText(row.emoji, 40, y);

      // Label
      ctx.font      = '14px Inter, system-ui, sans-serif';
      ctx.fillStyle = C.GRAY_700;
      ctx.fillText(row.label, 68, y);

      // Amount
      ctx.font      = '600 14px Inter, system-ui, sans-serif';
      ctx.fillStyle = C.GRAY_700;
      ctx.textAlign = 'right';
      ctx.fillText(this.rupee(row.amount), w - 40, y);

      y += 36;
    }

    // Grand Total row
    ctx.font      = 'bold 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.GRAY_900;
    ctx.textAlign = 'left';
    ctx.fillText('Grand Total', 40, y + 10);

    ctx.font      = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.BRAND_500;
    ctx.textAlign = 'right';
    ctx.fillText(this.rupee(g.result.grandTotal), w - 40, y + 12);

    // Average line
    const avgY = y + 44 + 20;
    const daywise = g.expenses.splitMode === 'daywise';
    let avgLabel: string;
    let avgValue: number;
    if (daywise) {
      const pool = g.result.totalRation + g.result.totalVegetable;
      const totalDays = g.members
        .filter(m => m.includeRationVeg)
        .reduce((s, m) => s + m.daysPresent, 0);
      avgValue = totalDays > 0 ? pool / totalDays : 0;
      avgLabel = 'Daily Avg (Ration + Veggie)';
    } else {
      avgValue = g.members.length > 0 ? g.result.grandTotal / g.members.length : 0;
      avgLabel = 'Per Person Avg (All)';
    }
    ctx.font      = '13px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.GRAY_400;
    ctx.textAlign = 'left';
    ctx.fillText(avgLabel, 40, avgY);
    ctx.font      = '600 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = C.GRAY_700;
    ctx.textAlign = 'right';
    ctx.fillText(this.rupee(avgValue) + (daywise ? '/day' : '/member'), w - 40, avgY);

    return y + 80;
  }

  private drawDivider(ctx: CanvasRenderingContext2D, w: number, y: number): void {
    ctx.save();
    ctx.strokeStyle = C.GRAY_200;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(w - 40, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawMemberSection(
    ctx: CanvasRenderingContext2D,
    g: Group,
    w: number,
    startY: number,
  ): number {
    const daywise = g.expenses.splitMode === 'daywise';
    const hasPaid = g.result.shares.some(s => s.personalExpensePaid > 0);
    const rowH = 68 + (hasPaid ? 16 : 0);
    let y = startY + 8;

    // Section label
    ctx.font         = '600 11px Inter, system-ui, sans-serif';
    ctx.fillStyle    = C.GRAY_400;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('MEMBER BREAKDOWN', 40, y);
    y += 28;

    const shares = g.result.shares;
    for (let i = 0; i < shares.length; i++) {
      const share  = shares[i];
      const isDebt = share.total >= 0;

      // Avatar circle
      const avatarY = y + 28;
      ctx.beginPath();
      ctx.arc(56, avatarY, 22, 0, Math.PI * 2);
      ctx.fillStyle = C.BRAND_50;
      ctx.fill();
      ctx.font         = 'bold 13px Inter, system-ui, sans-serif';
      ctx.fillStyle    = C.BRAND_600;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(share.memberName.slice(0, 2).toUpperCase(), 56, avatarY);

      // Member name
      ctx.font         = '600 15px Inter, system-ui, sans-serif';
      ctx.fillStyle    = C.GRAY_900;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(this.truncate(ctx, share.memberName, w - 40 - 90 - 160), 90, y + 18);

      // Sub-line: chips (days · paid · status)
      let chipX = 90;
      const chipY = y + 36;
      ctx.font      = '11px Inter, system-ui, sans-serif';

      if (daywise) {
        ctx.fillStyle = C.BRAND_500;
        ctx.fillText(`${share.daysPresent}d`, chipX, chipY);
        chipX += ctx.measureText(`${share.daysPresent}d`).width + 10;
        ctx.fillStyle = C.GRAY_200;
        ctx.fillText('·', chipX - 6, chipY);
      }

      if (share.personalExpensePaid > 0) {
        ctx.fillStyle = '#059669';
        ctx.fillText(`Paid ${this.rupee(share.personalExpensePaid)}`, chipX, chipY);
        chipX += ctx.measureText(`Paid ${this.rupee(share.personalExpensePaid)}`).width + 10;
        ctx.fillStyle = C.GRAY_200;
        ctx.fillText('·', chipX - 6, chipY);
      }

      ctx.fillStyle = isDebt ? C.GRAY_400 : C.SUCCESS;
      ctx.fillText(isDebt ? 'Pays' : 'Gets back', chipX, chipY);

      // Net pay amount (right side)
      ctx.font         = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillStyle    = isDebt ? C.BRAND_600 : C.SUCCESS;
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.rupee(share.total), w - 40, y + 28);

      // Row separator
      if (i < shares.length - 1) {
        ctx.strokeStyle = C.GRAY_100;
        ctx.lineWidth   = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(90, y + rowH);
        ctx.lineTo(w - 40, y + rowH);
        ctx.stroke();
      }

      y += rowH;
    }
    return y;
  }

  private drawVerification(
    ctx: CanvasRenderingContext2D,
    g: Group,
    w: number,
    y: number,
  ): void {
    const ok = g.result.verificationOk;
    const bg = ok ? '#d1fae5' : '#fee2e2';
    const fg = ok ? '#065f46' : '#991b1b';

    this.roundRect(ctx, 40, y, w - 80, 28, 8);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.font         = '600 12px Inter, system-ui, sans-serif';
    ctx.fillStyle    = fg;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const label = ok
      ? `✓ Verification passed — total = ${this.rupee(g.result.grandTotal)}`
      : `✗ Verification failed`;
    ctx.fillText(label, w / 2, y + 14);
  }

  private drawFooter(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const date = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    ctx.font         = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle    = C.GRAY_400;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`Generated by Split Karo • ${date}`, w / 2, h - 18);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    r: number | { tl: number; tr: number; bl: number; br: number },
  ): void {
    const rad = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : r;
    ctx.beginPath();
    ctx.moveTo(x + rad.tl, y);
    ctx.lineTo(x + w - rad.tr, y);
    ctx.arcTo(x + w, y,     x + w, y + h,     rad.tr);
    ctx.arcTo(x + w, y + h, x,     y + h,     rad.br);
    ctx.arcTo(x,     y + h, x,     y,         rad.bl);
    ctx.arcTo(x,     y,     x + w, y,         rad.tl);
    ctx.closePath();
  }

  private truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  private rupee(amount: number): string {
    return '₹' + Math.abs(Math.round(amount)).toLocaleString('en-IN');
  }

  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/png',
        1.0,
      );
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
