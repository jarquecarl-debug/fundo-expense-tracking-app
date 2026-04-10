import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Calendar, Plus, Wallet, AlertTriangle,
  Download, History, ChevronDown, ChevronUp, Printer, FileText,
} from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import {
  formatPeso, calcActualTotal, calcEstimatedTotal,
  getDaysUntil, getBudgetStatus,
} from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { SubcategorySection } from "@/components/SubcategorySection";
import { SpendingChart } from "@/components/SpendingChart";
import { BudgetBreakdownChart } from "@/components/BudgetBreakdownChart";
import { SubcategoryDialog } from "@/components/dialogs/SubcategoryDialog";
import { Button } from "@/components/ui/button";
import { exportEnvelopeToCsv } from "@/lib/export";
import { exportEnvelopeToPdf } from "@/lib/exportPdf";
import { toast } from "sonner";

// ── Empty state illustration ──────────────────────────────────────────────────
function EmptyCategoriesIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <rect x="12" y="22" width="72" height="54" rx="8"
        fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <rect x="20" y="34" width="40" height="6" rx="3" fill="hsl(var(--border))" />
      <rect x="20" y="46" width="28" height="5" rx="2.5" fill="hsl(var(--muted-foreground)/0.3)" />
      <rect x="20" y="57" width="32" height="5" rx="2.5" fill="hsl(var(--muted-foreground)/0.2)" />
      <path d="M28 22 L28 16 Q28 10 34 10 L62 10 Q68 10 68 16 L68 22"
        stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="3 2" />
      {/* Plus badge */}
      <circle cx="72" cy="70" r="14" fill="hsl(var(--primary))" />
      <line x1="72" y1="64" x2="72" y2="76" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="66" y1="70" x2="78" y2="70" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function EnvelopeDetail() {
  const { envelopeId } = useParams<{ envelopeId: string }>();
  const { envelopes } = useFundo();
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const envelope = envelopes.find((e) => e.id === envelopeId);

  if (!envelope) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Envelope not found</h2>
          <Link href="/" className="text-primary hover:underline text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEstimated = allItems.reduce(
    (sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0
  );
  const totalActual = allItems.reduce(
    (sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0
  );
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = envelope.totalBudget - effectiveSpend;
  const status = getBudgetStatus(
    effectiveSpend, envelope.totalBudget, envelope.warningThreshold ?? 80
  );

  const paidItems = allItems.filter((i) => i.status === "Paid");
  const paidTotal = paidItems.reduce(
    (sum, i) => sum + calcActualTotal(i.quantity, i.actualUnitPrice), 0
  );
  const unorderedCount = allItems.filter((i) => i.status === "Unordered").length;
  const totalPayments = allItems.reduce(
    (s, i) => s + (i.payments ?? []).reduce((ps, p) => ps + p.amount, 0), 0
  );
  const daysUntil = envelope.eventDate ? getDaysUntil(envelope.eventDate) : null;

  function formatHistoryTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  }

  async function handleExportPdf() {
    if (!envelope) return;
    setExportingPdf(true);
    try {
      await exportEnvelopeToPdf(envelope);
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("PDF export failed. Try using Print instead.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* id="envelope-pdf-root" wraps everything html2canvas should capture */}
      <div id="envelope-pdf-root" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:py-4">

        {/* ── Page header (hidden in print) ── */}
        <div className="print:hidden mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold" data-testid="text-envelope-title">
                  {envelope.name}
                </h1>
                {status !== "ok" && (
                  <AlertTriangle
                    className={`w-5 h-5 ${status === "danger" ? "text-red-500" : "text-amber-500"}`}
                  />
                )}
              </div>
              {envelope.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {envelope.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {envelope.eventDate && daysUntil !== null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span
                    className={`font-medium ${
                      daysUntil < 0
                        ? "text-muted-foreground"
                        : daysUntil <= 7
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(envelope.eventDate).toLocaleDateString("en-PH", {
                      dateStyle: "medium",
                    })}
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

            {/* ── Action buttons: Export PDF replaces Share ── */}
            <div className="flex gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                data-testid="button-export-pdf"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                {exportingPdf ? "Exporting…" : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportEnvelopeToCsv(envelope)}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                data-testid="button-print"
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* ── Print-only header ── */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{envelope.name}</h1>
          {envelope.eventDate && (
            <p className="text-sm text-muted-foreground">
              {new Date(envelope.eventDate).toLocaleDateString("en-PH", { dateStyle: "long" })}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Printed {new Date().toLocaleDateString("en-PH", { dateStyle: "medium" })}
          </p>
        </div>

        {/* ── Notes ── */}
        {envelope.notes && (
          <div className="rounded-xl border border-card-border bg-card p-4 mb-4 flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-foreground whitespace-pre-line">{envelope.notes}</p>
          </div>
        )}

        {/* ── Budget summary card ── */}
        <div
          className={`rounded-xl border p-5 mb-6 bg-card ${
            status === "danger"
              ? "border-red-300 dark:border-red-800"
              : status === "warning"
              ? "border-amber-300 dark:border-amber-800"
              : "border-card-border"
          }`}
        >
          <div className="space-y-2 mb-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Estimated vs Budget</span>
                <span>
                  {envelope.totalBudget > 0
                    ? ((totalEstimated / envelope.totalBudget) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
              <BudgetProgressBar
                used={totalEstimated}
                total={envelope.totalBudget}
                height="h-2"
                warningAt={envelope.warningThreshold}
              />
            </div>
            {totalActual > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Actual vs Budget</span>
                  <span className="text-primary">
                    {envelope.totalBudget > 0
                      ? ((totalActual / envelope.totalBudget) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <BudgetProgressBar
                  used={totalActual}
                  total={envelope.totalBudget}
                  height="h-2"
                  warningAt={envelope.warningThreshold}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Total Budget</div>
              <div className="font-semibold text-lg" data-testid="text-detail-budget">
                {formatPeso(envelope.totalBudget)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Estimated</div>
              <div className="font-semibold text-lg" data-testid="text-detail-estimated">
                {formatPeso(totalEstimated)}
              </div>
            </div>
            {totalActual > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Actual</div>
                <div
                  className="font-semibold text-lg text-primary"
                  data-testid="text-detail-actual"
                >
                  {formatPeso(totalActual)}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Remaining</div>
              <div
                className={`font-semibold text-lg ${
                  remaining < 0
                    ? "text-red-500"
                    : remaining < envelope.totalBudget * 0.2
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400"
                }`}
                data-testid="text-detail-remaining"
              >
                {formatPeso(remaining)}
              </div>
            </div>
          </div>

          {(paidTotal > 0 || unorderedCount > 0 || totalPayments > 0) && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm">
              {paidTotal > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatPeso(paidTotal)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({paidItems.length} item{paidItems.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              {totalPayments > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Partial payments:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatPeso(totalPayments)}
                  </span>
                </div>
              )}
              {unorderedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span className="text-muted-foreground">
                    {unorderedCount} item{unorderedCount !== 1 ? "s" : ""} still unordered
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <SpendingChart envelope={envelope} />
          <BudgetBreakdownChart envelope={envelope} />
        </div>

        {/* ── Categories header ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">
            Categories
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({envelope.subcategories.length})
            </span>
          </h2>
          <Button
            size="sm"
            onClick={() => setAddSubOpen(true)}
            className="print:hidden"
            data-testid="button-add-subcategory"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </Button>
        </div>

        {/* ── Empty state with illustration ── */}
        {envelope.subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <EmptyCategoriesIllustration />
            <h3 className="text-base font-semibold mt-5 mb-1">No categories yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-5">
              Add categories to organise your expenses — like "Food", "Transport", or "Venue".
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
                allSubcategories={envelope.subcategories}
              />
            ))}
          </div>
        )}

        {/* ── Activity log ── */}
        {(envelope.history?.length ?? 0) > 0 && (
          <div className="mt-8 border border-border rounded-xl overflow-hidden print:hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 transition-colors text-sm font-medium"
              onClick={() => setHistoryOpen((p) => !p)}
              data-testid="button-toggle-history"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Activity Log
                <span className="text-muted-foreground font-normal">
                  ({envelope.history.length} events)
                </span>
              </div>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {historyOpen && (
              <div className="bg-card border-t border-border divide-y divide-border max-h-64 overflow-y-auto">
                {envelope.history.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    data-testid={`history-event-${event.id}`}
                  >
                    <span className="text-foreground">{event.description}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4">
                      {formatHistoryTime(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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