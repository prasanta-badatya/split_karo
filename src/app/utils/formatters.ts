export function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
