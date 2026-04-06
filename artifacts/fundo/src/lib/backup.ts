import { Envelope, ExpenseItem } from "@/context/FundoContext";

const STORAGE_KEY = "fundo_envelopes";

export function exportBackup(): void {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "[]";
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fundo_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<Envelope[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as Envelope[];
        if (!Array.isArray(data)) throw new Error("Invalid backup format");
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export interface CsvRow {
  name: string;
  quantity: number;
  estimatedUnitPrice: number;
  actualUnitPrice?: number;
  vendor?: string;
  notes?: string;
}

export function parseCsvItems(csvText: string): CsvRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

  const colIndex = (names: string[]): number => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const nameCol = colIndex(["name", "item", "description"]);
  const qtyCol = colIndex(["quantity", "qty", "count"]);
  const estCol = colIndex(["estimatedunitprice", "estimated", "estprice", "est", "price", "unitprice"]);
  const actCol = colIndex(["actualunitprice", "actual", "actualprice", "act"]);
  const vendorCol = colIndex(["vendor", "supplier", "from"]);
  const notesCol = colIndex(["notes", "note", "remarks"]);

  if (nameCol < 0) throw new Error('CSV must have a "name" or "item" column');

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[nameCol]?.trim();
    if (!name) continue;
    rows.push({
      name,
      quantity: qtyCol >= 0 ? Math.max(1, parseFloat(cols[qtyCol] ?? "1") || 1) : 1,
      estimatedUnitPrice: estCol >= 0 ? parseFloat(cols[estCol]?.replace(/[₱,]/g, "") ?? "0") || 0 : 0,
      actualUnitPrice: actCol >= 0 ? (parseFloat(cols[actCol]?.replace(/[₱,]/g, "") ?? "") || undefined) : undefined,
      vendor: vendorCol >= 0 ? cols[vendorCol]?.trim() || undefined : undefined,
      notes: notesCol >= 0 ? cols[notesCol]?.trim() || undefined : undefined,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function buildImportedItems(rows: CsvRow[]): Omit<ExpenseItem, "id">[] {
  return rows.map((r) => ({
    name: r.name,
    quantity: r.quantity,
    estimatedUnitPrice: r.estimatedUnitPrice,
    actualUnitPrice: r.actualUnitPrice,
    vendor: r.vendor,
    notes: r.notes,
    status: "Unordered" as const,
    payments: [],
  }));
}
