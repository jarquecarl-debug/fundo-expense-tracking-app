import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar, ChevronDown } from "lucide-react";
import { Envelope } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";

type Scope = "3m" | "6m" | "1y" | "all";

interface MonthlySummaryProps {
  envelopes: Envelope[];
}

interface MonthData {
  label: string;
  key: string;
  estimated: number;
  actual: number;
  envelopeCount: number;
  topCategory: string | null;
}

const SCOPE_LABELS: Record<Scope, string> = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "1y": "This year",
  "all": "All time",
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
}

function buildMonthRange(scope: Scope): string[] {
  const now = new Date();
  const keys: string[] = [];

  if (scope === "3m") {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(getMonthKey(d));
    }
  } else if (scope === "6m") {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(getMonthKey(d));
    }
  } else if (scope === "1y") {
    for (let m = 0; m < 12; m++) {
      const d = new Date(now.getFullYear(), m, 1);
      keys.push(getMonthKey(d));
    }
  }

  return keys;
}

// Custom tooltip for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-card-border rounded-xl px-4 py-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-medium text-foreground">{formatPeso(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthlySummary({ envelopes }: MonthlySummaryProps) {
  const [scope, setScope] = useState<Scope>("3m");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeBar, setActiveBar] = useState<string | null>(null);

  const monthRange = useMemo(() => buildMonthRange(scope), [scope]);

  const monthlyData = useMemo((): MonthData[] => {
    // Determine which envelopes to include based on scope
    const now = new Date();
    let cutoff: Date | null = null;
    if (scope === "3m") cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    else if (scope === "6m") cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    else if (scope === "1y") cutoff = new Date(now.getFullYear(), 0, 1);

    // Group envelopes by their createdAt month
    const map = new Map<string, MonthData>();

    // Initialize all months in range
    if (scope !== "all") {
      for (const key of monthRange) {
        map.set(key, { label: getMonthLabel(key), key, estimated: 0, actual: 0, envelopeCount: 0, topCategory: null });
      }
    }

    for (const env of envelopes) {
      const createdDate = new Date(env.createdAt);
      if (cutoff && createdDate < cutoff) continue;

      const monthKey = getMonthKey(createdDate);
      if (!map.has(monthKey)) {
        if (scope === "all") {
          map.set(monthKey, { label: getMonthLabel(monthKey), key: monthKey, estimated: 0, actual: 0, envelopeCount: 0, topCategory: null });
        } else {
          continue; // skip out-of-range
        }
      }

      const entry = map.get(monthKey)!;
      entry.envelopeCount += 1;

      // Find top spending subcategory
      let topSubName: string | null = null;
      let topSubSpend = 0;

      for (const sub of env.subcategories) {
        const est = sub.items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
        const act = sub.items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
        const spend = act > 0 ? act : est;
        entry.estimated += sub.items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
        entry.actual += sub.items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);

        if (spend > topSubSpend) {
          topSubSpend = spend;
          topSubName = sub.name;
        }
      }

      if (topSubName && !entry.topCategory) entry.topCategory = topSubName;
    }

    // Sort by month key
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [envelopes, scope, monthRange]);

  const totals = useMemo(() => {
    const estimated = monthlyData.reduce((s, m) => s + m.estimated, 0);
    const actual = monthlyData.reduce((s, m) => s + m.actual, 0);
    const envelopes = monthlyData.reduce((s, m) => s + m.envelopeCount, 0);
    return { estimated, actual, envelopes };
  }, [monthlyData]);

  // Month-over-month trend
  const trend = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const last = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    const lastSpend = last.actual > 0 ? last.actual : last.estimated;
    const prevSpend = prev.actual > 0 ? prev.actual : prev.estimated;
    if (prevSpend === 0) return null;
    const pct = ((lastSpend - prevSpend) / prevSpend) * 100;
    return { pct, direction: pct > 5 ? "up" : pct < -5 ? "down" : "flat" };
  }, [monthlyData]);

  const highestMonth = useMemo(() => {
    return monthlyData.reduce((best, m) => {
      const spend = m.actual > 0 ? m.actual : m.estimated;
      const bestSpend = best ? (best.actual > 0 ? best.actual : best.estimated) : 0;
      return spend > bestSpend ? m : best;
    }, null as MonthData | null);
  }, [monthlyData]);

  if (envelopes.length === 0) return null;

  return (
    <div className="rounded-xl border border-card-border bg-card mb-6 overflow-hidden animate-fundo-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm leading-none mb-0.5">Monthly Summary</h2>
            <p className="text-xs text-muted-foreground">Spending overview by month</p>
          </div>
        </div>

        {/* Scope Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-1.5 text-xs font-medium bg-muted hover:bg-accent text-foreground px-3 py-1.5 rounded-lg transition-colors"
          >
            {SCOPE_LABELS[scope]}
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-popover-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[150px] animate-fundo-scale">
              {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setScope(s); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs hover:bg-accent transition-colors ${scope === s ? "text-primary font-semibold bg-primary/5" : "text-foreground"}`}
                >
                  {SCOPE_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat-bar pl-4">
            <div className="text-xs text-muted-foreground mb-0.5">Total Estimated</div>
            <div className="font-semibold text-base">{formatPeso(totals.estimated)}</div>
          </div>
          <div className="stat-bar pl-4" style={{ "--bar-color": "hsl(var(--chart-2))" } as any}>
            <div className="text-xs text-muted-foreground mb-0.5">Total Actual</div>
            <div className="font-semibold text-base text-primary">{formatPeso(totals.actual)}</div>
          </div>
          <div className="stat-bar pl-4">
            <div className="text-xs text-muted-foreground mb-0.5">Envelopes Tracked</div>
            <div className="font-semibold text-base">{totals.envelopes}</div>
          </div>
          <div className="stat-bar pl-4">
            <div className="text-xs text-muted-foreground mb-0.5">vs Last Month</div>
            <div className="flex items-center gap-1 font-semibold text-base">
              {trend === null ? (
                <span className="text-muted-foreground text-sm">—</span>
              ) : trend.direction === "up" ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">+{trend.pct.toFixed(0)}%</span>
                </>
              ) : trend.direction === "down" ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">{trend.pct.toFixed(0)}%</span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Stable</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        {monthlyData.length > 0 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.06)" }} />
                <Bar dataKey="estimated" name="estimated" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((m) => (
                    <Cell
                      key={m.key}
                      fill={activeBar === m.key ? "hsl(var(--primary) / 0.5)" : "hsl(var(--primary) / 0.25)"}
                    />
                  ))}
                </Bar>
                <Bar dataKey="actual" name="actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((m) => (
                    <Cell
                      key={m.key}
                      fill={m.key === highestMonth?.key ? "hsl(var(--chart-4))" : "hsl(var(--primary))"}
                      onMouseEnter={() => setActiveBar(m.key)}
                      onMouseLeave={() => setActiveBar(null)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No data for this period
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <span>Estimated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Actual</span>
          </div>
          {highestMonth && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-3 h-3 rounded-sm bg-chart-4" />
              <span>Highest month: <span className="text-foreground font-medium">{highestMonth.label}</span></span>
            </div>
          )}
        </div>

        {/* Monthly breakdown table */}
        {monthlyData.length > 0 && (
          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
              <span>Month</span>
              <span className="text-right">Estimated</span>
              <span className="text-right">Actual</span>
              <span className="text-right">Envelopes</span>
            </div>
            {monthlyData.map((m, i) => {
              const spend = m.actual > 0 ? m.actual : m.estimated;
              const isHighest = m.key === highestMonth?.key;
              return (
                <div
                  key={m.key}
                  className={`grid grid-cols-4 px-4 py-2.5 text-sm transition-colors hover:bg-accent/40 ${i < monthlyData.length - 1 ? "border-b border-border" : ""} ${isHighest ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.label}</span>
                    {isHighest && <span className="text-[10px] bg-chart-4/20 text-chart-4 px-1.5 py-0.5 rounded-full font-medium hidden sm:inline">peak</span>}
                  </div>
                  <span className="text-right text-muted-foreground">{formatPeso(m.estimated)}</span>
                  <span className={`text-right font-medium ${m.actual > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {m.actual > 0 ? formatPeso(m.actual) : "—"}
                  </span>
                  <span className="text-right text-muted-foreground">{m.envelopeCount}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}