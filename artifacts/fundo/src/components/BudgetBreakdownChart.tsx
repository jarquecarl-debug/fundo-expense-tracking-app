import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Envelope } from "@/context/FundoContext";
import { calcEstimatedTotal, calcActualTotal, formatPeso } from "@/lib/format";

interface BudgetBreakdownChartProps {
  envelope: Envelope;
}

export function BudgetBreakdownChart({ envelope }: BudgetBreakdownChartProps) {
  const data = envelope.subcategories.map((sub) => {
    const estimated = sub.items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
    const actual = sub.items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
    return {
      name: sub.name.length > 14 ? sub.name.slice(0, 12) + "…" : sub.name,
      estimated,
      actual: actual > 0 ? actual : null,
      allocated: sub.allocatedBudget ?? null,
    };
  }).filter((d) => d.estimated > 0 || (d.allocated ?? 0) > 0);

  if (data.length === 0) return null;

  const hasAllocated = data.some((d) => d.allocated !== null);
  const hasActual = data.some((d) => d.actual !== null);

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 mb-6 print:break-inside-avoid">
      <h3 className="text-sm font-semibold mb-3">Budget Breakdown by Category</h3>
      <div style={{ height: Math.max(180, data.length * 48) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
            <XAxis
              type="number"
              tickFormatter={(v) => `₱${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number | null, name: string) => [
                value !== null ? formatPeso(value) : "—",
                name === "estimated" ? "Estimated" : name === "actual" ? "Actual" : "Allocated",
              ]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            {hasAllocated && (
              <Bar dataKey="allocated" name="Allocated" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} barSize={6} />
            )}
            <Bar dataKey="estimated" name="Estimated" fill="hsl(25 85% 55%)" radius={[0, 4, 4, 0]} barSize={hasActual ? 8 : 12} fillOpacity={0.7} />
            {hasActual && (
              <Bar dataKey="actual" name="Actual" fill="hsl(25 85% 45%)" radius={[0, 4, 4, 0]} barSize={8} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        {hasAllocated && <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-muted" /> Allocated</span>}
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-primary/70" /> Estimated</span>
        {hasActual && <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-primary" /> Actual</span>}
      </div>
    </div>
  );
}
