import { Link } from "wouter";
import { Calendar, ChevronRight, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Envelope } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal, getDaysUntil, getBudgetStatus } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { Button } from "@/components/ui/button";

interface EnvelopeCardProps {
  envelope: Envelope;
  onEdit: () => void;
  onDelete: () => void;
}

export function EnvelopeCard({ envelope, onEdit, onDelete }: EnvelopeCardProps) {
  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEstimated = allItems.reduce((sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0);
  const totalActual = allItems.reduce((sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0);
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = envelope.totalBudget - effectiveSpend;
  const status = getBudgetStatus(effectiveSpend, envelope.totalBudget);

  const daysUntil = envelope.eventDate ? getDaysUntil(envelope.eventDate) : null;

  return (
    <div
      data-testid={`card-envelope-${envelope.id}`}
      className={`relative bg-card border rounded-xl p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
        status === "danger" ? "border-red-300 dark:border-red-800" :
        status === "warning" ? "border-amber-300 dark:border-amber-800" :
        "border-card-border"
      }`}
    >
      {status !== "ok" && (
        <div className={`absolute top-3 right-12 ${status === "danger" ? "text-red-500" : "text-amber-500"}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate" data-testid={`text-envelope-name-${envelope.id}`}>
            {envelope.name}
          </h3>
          {envelope.eventDate && daysUntil !== null && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-xs font-medium ${daysUntil < 0 ? "text-muted-foreground" : daysUntil <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {daysUntil === 0
                  ? "Today"
                  : daysUntil > 0
                  ? `${daysUntil} day${daysUntil !== 1 ? "s" : ""} remaining`
                  : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} data-testid={`button-edit-envelope-${envelope.id}`}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} data-testid={`button-delete-envelope-${envelope.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <BudgetProgressBar used={effectiveSpend} total={envelope.totalBudget} showLabel height="h-2.5" />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="text-muted-foreground">Budget</div>
        <div className="text-right font-medium" data-testid={`text-budget-${envelope.id}`}>{formatPeso(envelope.totalBudget)}</div>
        <div className="text-muted-foreground">Estimated</div>
        <div className="text-right" data-testid={`text-estimated-${envelope.id}`}>{formatPeso(totalEstimated)}</div>
        {totalActual > 0 && (
          <>
            <div className="text-muted-foreground">Actual</div>
            <div className="text-right text-primary font-medium" data-testid={`text-actual-${envelope.id}`}>{formatPeso(totalActual)}</div>
          </>
        )}
        <div className={`text-muted-foreground`}>Remaining</div>
        <div className={`text-right font-semibold ${remaining < 0 ? "text-red-500" : remaining < envelope.totalBudget * 0.2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} data-testid={`text-remaining-${envelope.id}`}>
          {formatPeso(remaining)}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {envelope.subcategories.length} {envelope.subcategories.length === 1 ? "category" : "categories"} &middot; {allItems.length} {allItems.length === 1 ? "item" : "items"}
      </div>

      <Link href={`/envelope/${envelope.id}`}>
        <a
          data-testid={`link-envelope-${envelope.id}`}
          className="flex items-center justify-center gap-1 w-full py-2 rounded-lg bg-muted hover:bg-accent text-sm font-medium text-foreground transition-colors"
        >
          View Details <ChevronRight className="w-4 h-4" />
        </a>
      </Link>
    </div>
  );
}
