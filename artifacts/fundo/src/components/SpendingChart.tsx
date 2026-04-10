import { useState, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Envelope } from "@/context/FundoContext";
import { calcEstimatedTotal, calcActualTotal, formatPeso } from "@/lib/format";

const COLORS = [
  "hsl(25, 85%, 55%)",
  "hsl(45, 85%, 55%)",
  "hsl(200, 70%, 55%)",
  "hsl(280, 60%, 60%)",
  "hsl(150, 60%, 45%)",
  "hsl(0, 70%, 60%)",
  "hsl(320, 60%, 55%)",
  "hsl(170, 60%, 45%)",
];

function toRgba(hsl: string, alpha: number) {
  return hsl.replace(")", `, ${alpha})`).replace("hsl(", "hsla(");
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  estimated: number;
  actual: number;
  color: string;
  offsetY: "up" | "center" | "down";
}

interface SpendingChartProps {
  envelope: Envelope;
}

export function SpendingChart({ envelope }: SpendingChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const data = envelope.subcategories
    .map((sub) => {
      const estimated = sub.items.reduce(
        (s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice),
        0
      );
      const actual = sub.items.reduce(
        (s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice),
        0
      );
      const value = actual > 0 ? actual : estimated;
      return { name: sub.name, value, estimated, actual };
    })
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !tooltip) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

      let offsetY: "up" | "center" | "down" = "center";
      if (angle < -30) offsetY = "up";
      else if (angle > 30) offsetY = "down";

      setTooltip((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              offsetY,
            }
          : null
      );
    },
    [tooltip]
  );

  const handlePieEnter = useCallback(
    (data: { name: string; estimated: number; actual: number }, index: number, e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

      let offsetY: "up" | "center" | "down" = "center";
      if (angle < -30) offsetY = "up";
      else if (angle > 30) offsetY = "down";

      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        name: data.name,
        estimated: data.estimated,
        actual: data.actual,
        color: COLORS[index % COLORS.length],
        offsetY,
      });
    },
    []
  );

  const getTooltipTransform = (offsetY: "up" | "center" | "down") => {
    if (offsetY === "up") return "translate(12px, -100%)";
    if (offsetY === "down") return "translate(12px, 0%)";
    return "translate(12px, -50%)";
  };

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 mb-6 print:break-inside-avoid">
      <h3 className="text-sm font-semibold mb-3">Spending by Category</h3>
      <div
        className="h-52 relative"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
              onMouseEnter={handlePieEnter as never}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend
              formatter={(value) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              transform: getTooltipTransform(tooltip.offsetY),
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
            <p
              style={{
                fontWeight: 600,
                marginBottom: 5,
                color: tooltip.color,
                fontSize: 11,
              }}
            >
              {tooltip.name}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 3,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: "var(--muted-foreground, #9ca3af)",
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: toRgba(tooltip.color, 0.5),
                    display: "inline-block",
                  }}
                />
                Estimated
              </span>
              <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                {formatPeso(tooltip.estimated)}
              </span>
            </div>
            {tooltip.actual > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    color: "var(--muted-foreground, #9ca3af)",
                    fontSize: 11,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: tooltip.color,
                      display: "inline-block",
                    }}
                  />
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
    </div>
  );
}