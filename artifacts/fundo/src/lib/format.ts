export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calcEstimatedTotal(quantity: number, estimatedUnitPrice: number): number {
  return quantity * estimatedUnitPrice;
}

export function calcActualTotal(quantity: number, actualUnitPrice?: number): number {
  if (actualUnitPrice === undefined) return 0;
  return quantity * actualUnitPrice;
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getBudgetStatus(used: number, total: number): "ok" | "warning" | "danger" {
  if (total <= 0) return "ok";
  const pct = used / total;
  if (pct >= 1) return "danger";
  if (pct >= 0.8) return "warning";
  return "ok";
}
