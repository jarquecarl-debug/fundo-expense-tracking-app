import { Envelope } from "@/context/FundoContext";

function escapeCsv(val: string | number | undefined): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportEnvelopeToCsv(envelope: Envelope): void {
  const rows: string[][] = [
    ["Category", "Item", "Quantity", "Est. Unit Price", "Actual Unit Price", "Est. Total", "Actual Total", "Status", "Receipt Ref", "Notes"],
  ];

  for (const sub of envelope.subcategories) {
    for (const item of sub.items) {
      const estTotal = item.quantity * item.estimatedUnitPrice;
      const actTotal = item.actualUnitPrice !== undefined ? item.quantity * item.actualUnitPrice : "";
      rows.push([
        sub.name,
        item.name,
        String(item.quantity),
        String(item.estimatedUnitPrice),
        item.actualUnitPrice !== undefined ? String(item.actualUnitPrice) : "",
        String(estTotal),
        actTotal !== "" ? String(actTotal) : "",
        item.status,
        item.receiptRef ?? "",
        item.notes ?? "",
      ]);
    }
  }

  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEst = allItems.reduce((s, i) => s + i.quantity * i.estimatedUnitPrice, 0);
  const totalAct = allItems.reduce((s, i) => s + (i.actualUnitPrice !== undefined ? i.quantity * i.actualUnitPrice : 0), 0);

  rows.push([]);
  rows.push(["", "TOTAL", "", "", "", String(totalEst), totalAct > 0 ? String(totalAct) : "", "", "", ""]);
  rows.push(["", "BUDGET", "", "", "", String(envelope.totalBudget), "", "", "", ""]);
  rows.push(["", "REMAINING", "", "", "", String(envelope.totalBudget - (totalAct > 0 ? totalAct : totalEst)), "", "", "", ""]);

  const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${envelope.name.replace(/[^a-z0-9]/gi, "_")}_expenses.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
