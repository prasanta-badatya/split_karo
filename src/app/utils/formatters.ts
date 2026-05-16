export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs % 1 === 0 ? abs.toLocaleString('en-IN') : abs.toFixed(2);
  return '₹' + formatted;
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
