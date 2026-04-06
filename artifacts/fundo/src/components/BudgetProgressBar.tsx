import { getBudgetStatus } from "@/lib/format";

interface BudgetProgressBarProps {
  used: number;
  total: number;
  showLabel?: boolean;
  height?: string;
}

export function BudgetProgressBar({ used, total, showLabel = false, height = "h-2" }: BudgetProgressBarProps) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const status = getBudgetStatus(used, total);

  const barColor =
    status === "danger"
      ? "bg-red-500"
      : status === "warning"
      ? "bg-amber-400"
      : "bg-primary";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{pct.toFixed(0)}% used</span>
          {status === "danger" && <span className="text-red-500 font-medium">Over budget</span>}
          {status === "warning" && <span className="text-amber-500 font-medium">Nearing limit</span>}
        </div>
      )}
      <div className={`w-full bg-muted rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
          data-testid="budget-progress-fill"
        />
      </div>
    </div>
  );
}
