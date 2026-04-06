import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, Plus, Wallet, AlertTriangle } from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal, getDaysUntil, getBudgetStatus } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { SubcategorySection } from "@/components/SubcategorySection";
import { SubcategoryDialog } from "@/components/dialogs/SubcategoryDialog";
import { Button } from "@/components/ui/button";

export default function EnvelopeDetail() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const { envelopes } = useFundo();
  const [addSubOpen, setAddSubOpen] = useState(false);

  const envelope = envelopes.find((e) => e.id === envelopeId);

  if (!envelope) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Envelope not found</h2>
          <Link href="/">
            <a className="text-primary hover:underline text-sm">Back to Dashboard</a>
          </Link>
        </div>
      </div>
    );
  }

  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEstimated = allItems.reduce((sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0);
  const totalActual = allItems.reduce((sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0);
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = envelope.totalBudget - effectiveSpend;
  const status = getBudgetStatus(effectiveSpend, envelope.totalBudget);

  const daysUntil = envelope.eventDate ? getDaysUntil(envelope.eventDate) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4" data-testid="link-back-dashboard">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </a>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold" data-testid="text-envelope-title">{envelope.name}</h1>
                {status !== "ok" && (
                  <AlertTriangle className={`w-5 h-5 ${status === "danger" ? "text-red-500" : "text-amber-500"}`} />
                )}
              </div>
              {envelope.eventDate && daysUntil !== null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className={`font-medium ${daysUntil < 0 ? "text-muted-foreground" : daysUntil <= 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {new Date(envelope.eventDate).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    {" — "}
                    {daysUntil === 0
                      ? "Today"
                      : daysUntil > 0
                      ? `${daysUntil} day${daysUntil !== 1 ? "s" : ""} remaining`
                      : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} ago`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-5 mb-6 bg-card ${status === "danger" ? "border-red-300 dark:border-red-800" : status === "warning" ? "border-amber-300 dark:border-amber-800" : "border-card-border"}`}>
          <div className="mb-4">
            <BudgetProgressBar used={effectiveSpend} total={envelope.totalBudget} showLabel height="h-3" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Total Budget</div>
              <div className="font-semibold text-lg" data-testid="text-detail-budget">{formatPeso(envelope.totalBudget)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Estimated</div>
              <div className="font-semibold text-lg" data-testid="text-detail-estimated">{formatPeso(totalEstimated)}</div>
            </div>
            {totalActual > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Actual</div>
                <div className="font-semibold text-lg text-primary" data-testid="text-detail-actual">{formatPeso(totalActual)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Remaining</div>
              <div className={`font-semibold text-lg ${remaining < 0 ? "text-red-500" : remaining < envelope.totalBudget * 0.2 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`} data-testid="text-detail-remaining">
                {formatPeso(remaining)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">
            Categories
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({envelope.subcategories.length})
            </span>
          </h2>
          <Button size="sm" onClick={() => setAddSubOpen(true)} data-testid="button-add-subcategory">
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        </div>

        {envelope.subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No categories yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-5">
              Add categories to organize your expenses — like "Food", "Decorations", or "Venue".
            </p>
            <Button onClick={() => setAddSubOpen(true)} data-testid="button-add-first-subcategory">
              <Plus className="w-4 h-4 mr-2" /> Add First Category
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {envelope.subcategories.map((sub) => (
              <SubcategorySection
                key={sub.id}
                envelopeId={envelope.id}
                subcategory={sub}
              />
            ))}
          </div>
        )}
      </div>

      <SubcategoryDialog
        open={addSubOpen}
        onClose={() => setAddSubOpen(false)}
        envelopeId={envelope.id}
      />
    </div>
  );
}
