import { useMemo } from "react";
import { Envelope } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";
import { TrendingDown, Wallet, CheckCircle2, AlertCircle } from "lucide-react";

interface DashboardSummaryProps {
  envelopes: Envelope[];
}

export function DashboardSummary({ envelopes }: DashboardSummaryProps) {
  const stats = useMemo(() => {
    const active = envelopes.filter((e) => !e.archived);
    if (active.length === 0) return null;

    let totalBudget = 0;
    let totalEstimated = 0;
    let totalActual = 0;
    let overBudgetCount = 0;
    let paidItemsCount = 0;
    let totalItems = 0;

    for (const env of active) {
      totalBudget += env.totalBudget;
      const items = env.subcategories.flatMap((s) => s.items);
      totalEstimated += items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
      totalActual += items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
      paidItemsCount += items.filter((i) => i.status === "Paid").length;
      totalItems += items.length;

      const spend = totalActual > 0 ? totalActual : totalEstimated;
      if (spend > env.totalBudget) overBudgetCount++;
    }

    const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
    const remaining = totalBudget - effectiveSpend;
    const pct = totalBudget > 0 ? Math.min(100, (effectiveSpend / totalBudget) * 100) : 0;
    const isOver = remaining < 0;
    const isWarning = !isOver && pct >= 80;

    return {
      active,
      totalBudget,
      totalEstimated,
      totalActual,
      remaining,
      pct,
      isOver,
      isWarning,
      overBudgetCount,
      paidItemsCount,
      totalItems,
      effectiveSpend,
    };
  }, [envelopes]);

  if (!stats) return null;

  const statCards = [
    {
      label: "Combined Budget",
      value: formatPeso(stats.totalBudget),
      icon: <Wallet className="w-4 h-4" />,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Estimated Spend",
      value: formatPeso(stats.totalEstimated),
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-foreground",
      bg: "bg-muted/50",
    },
    {
      label: "Actual Spend",
      value: stats.totalActual > 0 ? formatPeso(stats.totalActual) : "—",
      icon: <TrendingDown className="w-4 h-4" />,
      color: stats.totalActual > 0 ? "text-primary" : "text-muted-foreground",
      bg: stats.totalActual > 0 ? "bg-primary/5" : "bg-muted/50",
    },
    {
      label: "Remaining",
      value: formatPeso(stats.remaining),
      icon: stats.isOver ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />,
      color: stats.isOver ? "text-red-400" : stats.isWarning ? "text-amber-400" : "text-green-400",
      bg: stats.isOver ? "bg-red-500/5" : stats.isWarning ? "bg-amber-500/5" : "bg-green-500/5",
    },
  ];

  return (
    <div className="mb-6 print:hidden">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-xl border border-card-border ${card.bg} p-4 glow-card animate-fundo-in`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`${card.color} mb-2 opacity-70`}>{card.icon}</div>
            <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
            <div className={`font-semibold text-lg leading-none ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-card-border bg-card p-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>
            Overall utilization across{" "}
            <span className="text-foreground font-medium">{stats.active.length}</span>{" "}
            active envelope{stats.active.length !== 1 ? "s" : ""}
          </span>
          <span className={`font-semibold ${stats.isOver ? "text-red-400" : stats.isWarning ? "text-amber-400" : "text-primary"}`}>
            {stats.pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full progress-fill transition-all ${
              stats.isOver ? "bg-red-500" : stats.isWarning ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, stats.pct)}%` }}
          />
        </div>

        {/* Extra stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          {stats.totalItems > 0 && (
            <span>
              <span className="text-foreground font-medium">{stats.paidItemsCount}</span>/{stats.totalItems} items paid
            </span>
          )}
          {stats.overBudgetCount > 0 && (
            <span className="text-red-400 font-medium">
              ⚠ {stats.overBudgetCount} over budget
            </span>
          )}
          {stats.totalActual > 0 && stats.totalEstimated > 0 && (
            <span className="ml-auto">
              Actual vs est:{" "}
              <span className={`font-medium ${stats.totalActual > stats.totalEstimated ? "text-red-400" : "text-green-400"}`}>
                {stats.totalActual > stats.totalEstimated ? "+" : ""}
                {formatPeso(stats.totalActual - stats.totalEstimated)}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}