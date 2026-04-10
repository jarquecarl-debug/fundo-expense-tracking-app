import { useState, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Envelope } from "@/context/FundoContext";
import { calcEstimatedTotal, calcActualTotal, formatPeso } from "@/lib/format";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OverviewChartProps {
  envelopes: Envelope[];
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  budget: number;
  spend: number;
  pct: number;
  over: boolean;
}

export function OverviewChart({ envelopes }: OverviewChartProps) {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = envelopes.filter((e) => !e.archived);
  if (active.length < 2) return null;

  const data = active
    .map((env) => {
      const items = env.subcategories.flatMap((s) => s.items);
      const estimated = items.reduce(
        (s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice),
        0
      );
      const actual = items.reduce(
        (s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice),
        0
      );
      const spend = actual > 0 ? actual : estimated;
      const pct =
        env.totalBudget > 0 ? Math.min(100, (spend / env.totalBudget) * 100) : 0;
      return {
        name: env.name.length > 14 ? env.name.slice(0, 12) + "…" : env.name,
        fullName: env.name,
        budget: env.totalBudget,
        spend,
        pct,
        over: spend > env.totalBudget,
      };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  const getSpendColor = (entry: typeof data[0]) =>
    entry.over
      ? "hsl(0, 70%, 60%)"
      : entry.pct >= 80
      ? "hsl(45, 85%, 55%)"
      : "hsl(25, 85%, 55%)";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartMouseMove = useCallback((chartState: any, e: React.MouseEvent) => {
    if (!containerRef.current || !chartState?.activePayload?.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const entry = chartState.activePayload[0].payload;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      name: entry.fullName,
      budget: entry.budget,
      spend: entry.spend,
      pct: entry.pct,
      over: entry.over,
    });
  }, []);

  const handleChartMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="rounded-xl border border-card-border bg-card mb-6 overflow-hidden print:hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <span>Envelope Utilization</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <div
            ref={containerRef}
            style={{ height: Math.max(180, data.length * 40), position: "relative" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
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

                <Bar
                  dataKey="budget"
                  name="Budget"
                  fill="hsl(var(--muted))"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="spend"
                  name="Spend"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                  isAnimationActive={false}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={getSpendColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {tooltip && (
              <div
                style={{
                  position: "absolute",
                  left: tooltip.x + 14,
                  top: tooltip.y,
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  zIndex: 50,
                  background: "var(--card, #1e2130)",
                  border: `1px solid ${
                    tooltip.over
                      ? "hsl(0,70%,60%)"
                      : tooltip.pct >= 80
                      ? "hsl(45,85%,55%)"
                      : "hsl(25,85%,55%)"
                  }`,
                  borderLeft: `3px solid ${
                    tooltip.over
                      ? "hsl(0,70%,60%)"
                      : tooltip.pct >= 80
                      ? "hsl(45,85%,55%)"
                      : "hsl(25,85%,55%)"
                  }`,
                  borderRadius: "8px",
                  padding: "7px 11px",
                  fontSize: "12px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                  minWidth: "160px",
                  whiteSpace: "nowrap",
                }}
              >
                {(() => {
                  const color = tooltip.over
                    ? "hsl(0,70%,60%)"
                    : tooltip.pct >= 80
                    ? "hsl(45,85%,55%)"
                    : "hsl(25,85%,55%)";
                  return (
                    <>
                      <p style={{ fontWeight: 600, marginBottom: 5, color, fontSize: 11 }}>
                        {tooltip.name}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 3 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted-foreground, #9ca3af)", fontSize: 11 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: "hsl(var(--muted))", display: "inline-block" }} />
                          Budget
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                          {formatPeso(tooltip.budget)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 3 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted-foreground, #9ca3af)", fontSize: 11 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
                          Spend
                        </span>
                        <span style={{ fontWeight: 600, color }}>
                          {formatPeso(tooltip.spend)}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                        <span style={{ fontSize: 10, color: "var(--muted-foreground, #9ca3af)" }}>
                          Utilization
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color }}>
                          {tooltip.pct.toFixed(0)}%{tooltip.over ? " ⚠" : ""}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm inline-block bg-muted" /> Budget
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm inline-block bg-primary" /> Spend
            </span>
          </div>
        </div>
      )}
    </div>
  );
}