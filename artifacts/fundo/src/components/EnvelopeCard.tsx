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
  const status = getBudgetStatus(effectiveSpend, envelope.totalBudget, envelope.warningThreshold ?? 80);

  const daysUntil = envelope.eventDate ? getDaysUntil(envelope.eventDate) : null;
  const unorderedCount = allItems.filter((i) => i.status === "Unordered").length;
  const paidTotal = allItems
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
  const highPriorityCount = allItems.filter((i) => i.priority === "high" && i.status !== "Paid").length;
  const completionPct = allItems.length > 0
    ? Math.round((allItems.filter((i) => i.status === "Paid").length / allItems.length) * 100)
    : 0;

  function handleDuplicate() {
    duplicateEnvelope(envelope.id);
    toast.success(`"${envelope.name}" duplicated`);
  }

  function handleArchiveToggle() {
    archiveEnvelope(envelope.id, !envelope.archived);
    toast.success(envelope.archived ? "Envelope restored" : "Envelope archived");
  }

  const borderClass = envelope.archived
    ? "border-border opacity-60"
    : status === "danger"
    ? "border-red-500/40"
    : status === "warning"
    ? "border-amber-500/40"
    : "border-card-border";

  return (
    <div
      data-testid={`card-envelope-${envelope.id}`}
      className={`relative bg-card border rounded-xl flex flex-col gap-0 transition-all duration-200 overflow-hidden glow-card ${borderClass}`}
    >
      {/* Top accent bar */}
      {!envelope.archived && (
        <div
          className={`h-0.5 w-full ${
            status === "danger"
              ? "bg-gradient-to-r from-red-500/60 to-red-400/30"
              : status === "warning"
              ? "bg-gradient-to-r from-amber-500/60 to-amber-400/30"
              : "bg-gradient-to-r from-primary/60 to-primary/10"
          }`}
        />
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base truncate leading-tight" data-testid={`text-envelope-name-${envelope.id}`}>
                {envelope.name}
              </h3>
              {envelope.archived && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">archived</span>
              )}
              {status !== "ok" && !envelope.archived && (
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${status === "danger" ? "text-red-400" : "text-amber-400"}`} />
              )}
            </div>

            {/* Event date countdown */}
            {envelope.eventDate && daysUntil !== null && (
              <div className="flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className={`text-xs font-medium ${
                  daysUntil < 0 ? "text-muted-foreground" :
                  daysUntil <= 7 ? "text-amber-400" :
                  "text-muted-foreground"
                }`}>
                  {daysUntil === 0 ? "Today!" :
                   daysUntil > 0 ? `${daysUntil}d remaining` :
                   `${Math.abs(daysUntil)}d ago`}
                </span>
              </div>
            )}

            {/* Tags */}
            {envelope.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {envelope.tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium border border-primary/15">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 shrink-0 -mr-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleDuplicate} title="Duplicate" data-testid={`button-duplicate-envelope-${envelope.id}`}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleArchiveToggle} title={envelope.archived ? "Restore" : "Archive"} data-testid={`button-archive-envelope-${envelope.id}`}>
              {envelope.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit} data-testid={`button-edit-envelope-${envelope.id}`}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={onDelete} data-testid={`button-delete-envelope-${envelope.id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <BudgetProgressBar used={effectiveSpend} total={envelope.totalBudget} showLabel height="h-2" warningAt={envelope.warningThreshold} />

        {/* Budget stats */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div className="text-muted-foreground text-xs">Budget</div>
          <div className="text-right font-semibold text-xs" data-testid={`text-budget-${envelope.id}`}>{formatPeso(envelope.totalBudget)}</div>

          <div className="text-muted-foreground text-xs">Estimated</div>
          <div className="text-right text-xs" data-testid={`text-estimated-${envelope.id}`}>{formatPeso(totalEstimated)}</div>

          {totalActual > 0 && (
            <>
              <div className="text-muted-foreground text-xs">Actual</div>
              <div className="text-right text-primary font-medium text-xs" data-testid={`text-actual-${envelope.id}`}>{formatPeso(totalActual)}</div>
            </>
          )}
          {paidTotal > 0 && (
            <>
              <div className="text-muted-foreground text-xs">Paid</div>
              <div className="text-right text-green-400 font-medium text-xs">{formatPeso(paidTotal)}</div>
            </>
          )}

          <div className="text-muted-foreground text-xs">Remaining</div>
          <div
            className={`text-right font-bold text-xs ${
              remaining < 0 ? "text-red-400" :
              remaining < envelope.totalBudget * 0.2 ? "text-amber-400" :
              "text-green-400"
            }`}
            data-testid={`text-remaining-${envelope.id}`}
          >
            {formatPeso(remaining)}
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
          <span>
            {envelope.subcategories.length} {envelope.subcategories.length === 1 ? "cat" : "cats"}
            {" · "}
            {allItems.length} {allItems.length === 1 ? "item" : "items"}
            {completionPct > 0 && (
              <span className="text-primary ml-1">· {completionPct}% paid</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <span className="text-red-400 font-medium">{highPriorityCount} 🔴</span>
            )}
            {unorderedCount > 0 && (
              <span className="bg-muted px-1.5 py-0.5 rounded-full">{unorderedCount} unordered</span>
            )}
          </div>
        </div>
      </div>

      {/* View Details link */}
      <Link
        href={`/envelope/${envelope.id}`}
        data-testid={`link-envelope-${envelope.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 bg-muted/50 hover:bg-primary/10 hover:text-primary text-sm font-medium text-muted-foreground transition-all duration-200 border-t border-border group"
      >
        View Details
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}