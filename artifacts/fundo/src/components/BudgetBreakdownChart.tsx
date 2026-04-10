import { useState, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Envelope } from "@/context/FundoContext";
import { calcEstimatedTotal, calcActualTotal, formatPeso } from "@/lib/format";

interface BudgetBreakdownChartProps {
  envelope: Envelope;
}

const CATEGORY_COLORS = [
  "#f97316",
  "#eab308",
  "#38bdf8",
  "#a855f7",
  "#ec4899",
  "#22c55e",
  "#ef4444",
  "#14b8a6",
];

function toRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface TooltipState {
  x: number;
  y: number;
  fullName: string;
  estimated: number;
  actual: number | null;
  color: string;
}

export function BudgetBreakdownChart({ envelope }: BudgetBreakdownChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = envelope.subcategories
    .map((sub, index) => {
      const estimated = sub.items.reduce(
        (s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice),
        0
      );
      const actual = sub.items.reduce(
        (s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice),
        0
      );
      return {
        name: sub.name.length > 14 ? sub.name.slice(0, 12) + "…" : sub.name,
        fullName: sub.name,
        estimated,
        actual: actual > 0 ? actual : null,
        colorIndex: index,
      };
    })
    .filter((d) => d.estimated > 0);

  if (data.length === 0) return null;

  const hasActual = data.some((d) => d.actual !== null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartMouseMove = useCallback((chartState: any, e: React.MouseEvent) => {
    if (!containerRef.current || !chartState?.activePayload?.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const entry = chartState.activePayload[0].payload;
    const color = CATEGORY_COLORS[entry.colorIndex % CATEGORY_COLORS.length];
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      fullName: entry.fullName,
      estimated: entry.estimated,
      actual: entry.actual,
      color,
    });
  }, []);

  const handleChartMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 mb-6 print:break-inside-avoid">
      <h3 className="text-sm font-semibold mb-3">Budget Breakdown by Category</h3>

      <div
        ref={containerRef}
        style={{ height: Math.max(180, data.length * 56), position: "relative" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
            barCategoryGap="30%"
            barGap={3}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
          >
            <XAxis
              type="number"
              tickFormatter={(v) =>
                `₱${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`
              }
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

            <Bar dataKey="estimated" name="Estimated" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell
                  key={`est-${entry.colorIndex}`}
                  fill={toRgba(CATEGORY_COLORS[entry.colorIndex % CATEGORY_COLORS.length], 0.55)}
                />
              ))}
            </Bar>

            {hasActual && (
              <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell
                    key={`act-${entry.colorIndex}`}
                    fill={CATEGORY_COLORS[entry.colorIndex % CATEGORY_COLORS.length]}
                  />
                ))}
              </Bar>
            )}
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
              border: `1px solid ${tooltip.color}`,
              borderLeft: `3px solid ${tooltip.color}`,
              borderRadius: "8px",
              padding: "7px 11px",
              fontSize: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              minWidth: "160px",
              whiteSpace: "nowrap",
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 5, color: tooltip.color, fontSize: 11 }}>
              {tooltip.fullName}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted-foreground, #9ca3af)", fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: toRgba(tooltip.color, 0.55), display: "inline-block" }} />
                Estimated
              </span>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {formatPeso(tooltip.estimated)}
              </span>
            </div>
            {tooltip.actual != null && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--muted-foreground, #9ca3af)", fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: tooltip.color, display: "inline-block" }} />
                  Actual
                </span>
                <span style={{ fontWeight: 600, color: tooltip.color }}>
                  {formatPeso(tooltip.actual)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: toRgba(CATEGORY_COLORS[0], 0.55) }} />
          Estimated
        </span>
        {hasActual && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: CATEGORY_COLORS[0] }} />
            Actual
          </span>
        )}
      </div>
    </div>
  );
}