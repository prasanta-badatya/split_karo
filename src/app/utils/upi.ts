/**
 * UPI collect-request helpers. A single param set (`pa`/`pn`/`am`/`cu`/`tn`) drives
 * three outputs: the `upi://pay` deep-link, a QR payload, and a shareable
 * `https://` "pay link" that bounces to the deep-link via the in-app /pay route.
 * India-specific (NPCI UPI spec).
 */

export interface UpiRequest {
  vpa: string;
  name: string;
  amount: number;
  note?: string;
}

/** Canonical UPI query params, rounded to paise. Empty VPA still produces params. */
function upiParams(r: UpiRequest): URLSearchParams {
  const params = new URLSearchParams({
    pa: (r.vpa || '').trim(),
    pn: r.name || 'Payee',
    am: (Math.round(r.amount * 100) / 100).toFixed(2),
    cu: 'INR',
  });
  const note = (r.note || '').trim();
  if (note) params.set('tn', note);
  return params;
}

/**
 * Build a UPI deep-link (`upi://pay`) that opens GPay / PhonePe / Paytm / any UPI app
 * pre-filled with the payee VPA, name, amount and a note.
 * Returns '' if no valid VPA is given.
 */
export function buildUpiUri(payeeVpa: string, payeeName: string, amount: number, note = ''): string {
  const vpa = (payeeVpa || '').trim();
  if (!vpa) return '';
  return `upi://pay?${upiParams({ vpa, name: payeeName, amount, note }).toString()}`;
}

/** Same deep-link, from a {@link UpiRequest}. Returns '' if no VPA. */
export function buildUpiUriFrom(r: UpiRequest): string {
  return buildUpiUri(r.vpa, r.name, r.amount, r.note);
}

/**
 * Shareable `https://` pay link pointing at the in-app `/pay` redirect route.
 * Clickable in WhatsApp (unlike `upi://`); the route then hands off to the UPI app.
 * Resolved against the deployed base href (e.g. `/split_karo/`). Returns '' if no VPA.
 */
export function buildUpiPayLink(r: UpiRequest, baseUri = document.baseURI): string {
  if (!(r.vpa || '').trim()) return '';
  const url = new URL('pay', baseUri.endsWith('/') ? baseUri : baseUri + '/');
  url.search = upiParams(r).toString();
  return url.toString();
}

/** Basic sanity check for a UPI ID like name@bank. */
export function isValidUpi(vpa: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test((vpa || '').trim());
}
