import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Envelope } from "@/context/FundoContext";
import { calcEstimatedTotal, calcActualTotal, formatPeso } from "@/lib/format";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OverviewChartProps {
  envelopes: Envelope[];
}

export function OverviewChart({ envelopes }: OverviewChartProps) {
  const [open, setOpen] = useState(false);

  const active = envelopes.filter((e) => !e.archived);
  if (active.length < 2) return null;

  const data = active.map((env) => {
    const items = env.subcategories.flatMap((s) => s.items);
    const estimated = items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
    const actual = items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
    const spend = actual > 0 ? actual : estimated;
    const pct = env.totalBudget > 0 ? Math.min(100, (spend / env.totalBudget) * 100) : 0;
    return {
      name: env.name.length > 14 ? env.name.slice(0, 12) + "…" : env.name,
      budget: env.totalBudget,
      spend,
      pct,
      over: spend > env.totalBudget,
    };
  }).sort((a, b) => b.pct - a.pct).slice(0, 8);

  return (
    <div className="rounded-xl border border-card-border bg-card mb-6 overflow-hidden print:hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <span>Envelope Utilization</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div style={{ height: Math.max(180, data.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
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
                  formatter={(value: number, name: string) => [
                    formatPeso(value),
                    name === "budget" ? "Budget" : "Spend",
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="spend" name="Spend" radius={[0, 4, 4, 0]} barSize={10}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.over ? "hsl(0 70% 60%)" : entry.pct >= 80 ? "hsl(45 85% 55%)" : "hsl(25 85% 55%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-muted" /> Budget</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block bg-primary" /> Spend</span>
          </div>
        </div>
      )}
    </div>
  );
}
