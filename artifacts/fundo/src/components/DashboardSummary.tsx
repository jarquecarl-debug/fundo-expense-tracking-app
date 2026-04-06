import { Envelope } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";

interface DashboardSummaryProps {
  envelopes: Envelope[];
}

export function DashboardSummary({ envelopes }: DashboardSummaryProps) {
  const active = envelopes.filter((e) => !e.archived);
  if (active.length === 0) return null;

  let totalBudget = 0;
  let totalEstimated = 0;
  let totalActual = 0;

  for (const env of active) {
    totalBudget += env.totalBudget;
    const items = env.subcategories.flatMap((s) => s.items);
    totalEstimated += items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
    totalActual += items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
  }

  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = totalBudget - effectiveSpend;
  const pct = totalBudget > 0 ? Math.min(100, (effectiveSpend / totalBudget) * 100) : 0;
  const isOver = remaining < 0;
  const isWarning = !isOver && pct >= 80;

  return (
    <div className="rounded-xl border border-card-border bg-card p-4 mb-6 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Combined Budget</div>
            <div className="font-semibold">{formatPeso(totalBudget)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Estimated</div>
            <div className="font-semibold">{formatPeso(totalEstimated)}</div>
          </div>
          {totalActual > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Actual</div>
              <div className="font-semibold text-primary">{formatPeso(totalActual)}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">Remaining</div>
            <div className={`font-semibold ${isOver ? "text-red-500" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
              {formatPeso(remaining)}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall utilization across {active.length} active envelope{active.length !== 1 ? "s" : ""}</span>
          <span className={isOver ? "text-red-500" : isWarning ? "text-amber-600" : ""}>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
