import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
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

interface SpendingChartProps {
  envelope: Envelope;
}

export function SpendingChart({ envelope }: SpendingChartProps) {
  const data = envelope.subcategories
    .map((sub) => {
      const estimated = sub.items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
      const actual = sub.items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
      const value = actual > 0 ? actual : estimated;
      return { name: sub.name, value, estimated, actual };
    })
    .filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card p-5 mb-6 print:break-inside-avoid">
      <h3 className="text-sm font-semibold mb-3">Spending by Category</h3>
      <div className="h-52">
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
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props) => [
                formatPeso(value),
                props.payload.actual > 0 ? `${name} (actual)` : `${name} (estimated)`,
              ]}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
