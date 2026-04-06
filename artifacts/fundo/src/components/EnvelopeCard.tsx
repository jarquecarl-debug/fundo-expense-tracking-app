import { Link } from "wouter";
import { Calendar, ChevronRight, Pencil, Trash2, AlertTriangle, Copy, Archive, ArchiveRestore } from "lucide-react";
import { Envelope, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal, getDaysUntil, getBudgetStatus } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface EnvelopeCardProps {
  envelope: Envelope;
  onEdit: () => void;
  onDelete: () => void;
}

export function EnvelopeCard({ envelope, onEdit, onDelete }: EnvelopeCardProps) {
  const { archiveEnvelope, duplicateEnvelope } = useFundo();

  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEstimated = allItems.reduce((sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0);
  const totalActual = allItems.reduce((sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0);
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = envelope.totalBudget - effectiveSpend;
  const status = getBudgetStatus(effectiveSpend, envelope.totalBudget);

  const daysUntil = envelope.eventDate ? getDaysUntil(envelope.eventDate) : null;
  const unorderedCount = allItems.filter((i) => i.status === "Unordered").length;
  const paidTotal = allItems
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + calcActualTotal(i.quantity, i.actualUnitPrice), 0);

  function handleDuplicate() {
    duplicateEnvelope(envelope.id);
    toast.success(`"${envelope.name}" duplicated`);
  }

  function handleArchiveToggle() {
    archiveEnvelope(envelope.id, !envelope.archived);
    toast.success(envelope.archived ? "Envelope restored" : "Envelope archived");
  }

  return (
    <div
      data-testid={`card-envelope-${envelope.id}`}
      className={`relative bg-card border rounded-xl p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
        envelope.archived ? "opacity-60" :
        status === "danger" ? "border-red-300 dark:border-red-800" :
        status === "warning" ? "border-amber-300 dark:border-amber-800" :
        "border-card-border"
      }`}
    >
      {status !== "ok" && !envelope.archived && (
        <div className={`absolute top-3 right-12 ${status === "danger" ? "text-red-500" : "text-amber-500"}`}>
          <AlertTriangle className="w-4 h-4" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate" data-testid={`text-envelope-name-${envelope.id}`}>
              {envelope.name}
            </h3>
            {envelope.archived && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">archived</span>
            )}
          </div>
          {envelope.eventDate && daysUntil !== null && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-xs font-medium ${daysUntil < 0 ? "text-muted-foreground" : daysUntil <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {daysUntil === 0 ? "Today" : daysUntil > 0
                  ? `${daysUntil} day${daysUntil !== 1 ? "s" : ""} remaining`
                  : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`}
              </span>
            </div>
          )}
          {envelope.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {envelope.tags.map((tag) => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicate} title="Duplicate" data-testid={`button-duplicate-envelope-${envelope.id}`}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleArchiveToggle} title={envelope.archived ? "Restore" : "Archive"} data-testid={`button-archive-envelope-${envelope.id}`}>
            {envelope.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
          </Button>
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
        {paidTotal > 0 && (
          <>
            <div className="text-muted-foreground">Paid</div>
            <div className="text-right text-green-600 dark:text-green-400 font-medium">{formatPeso(paidTotal)}</div>
          </>
        )}
        <div className="text-muted-foreground">Remaining</div>
        <div className={`text-right font-semibold ${remaining < 0 ? "text-red-500" : remaining < envelope.totalBudget * 0.2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} data-testid={`text-remaining-${envelope.id}`}>
          {formatPeso(remaining)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{envelope.subcategories.length} {envelope.subcategories.length === 1 ? "category" : "categories"} &middot; {allItems.length} {allItems.length === 1 ? "item" : "items"}</span>
        {unorderedCount > 0 && (
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {unorderedCount} unordered
          </span>
        )}
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
