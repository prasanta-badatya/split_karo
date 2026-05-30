/**
 * Build a UPI deep-link (`upi://pay`) that opens GPay / PhonePe / Paytm / any UPI app
 * pre-filled with the payee VPA, name, amount and a note. India-specific.
 * Returns '' if no valid VPA is given.
 */
export function buildUpiUri(payeeVpa: string, payeeName: string, amount: number, note = ''): string {
  const vpa = (payeeVpa || '').trim();
  if (!vpa) return '';
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName || 'Payee',
    am: (Math.round(amount * 100) / 100).toFixed(2),
    cu: 'INR',
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}

/** Basic sanity check for a UPI ID like name@bank. */
export function isValidUpi(vpa: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test((vpa || '').trim());
}
