import { useMemo } from "react";
import { Link } from "wouter";
import { Wallet, Calendar, FileText, ArrowLeft, Eye } from "lucide-react";
import { decodeEnvelope } from "@/lib/share";
import { formatPeso, calcEstimatedTotal, calcActualTotal, getBudgetStatus } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { StatusBadge } from "@/components/StatusBadge";

export default function SharedView() {
  const envelope = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (!d) return null;
    return decodeEnvelope(d);
  }, []);

  if (!envelope) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Invalid share link</h2>
          <Link href="/" className="text-primary hover:underline text-sm">Go to Fundo</Link>
        </div>
      </div>
    );
  }

  const allItems = envelope.subcategories.flatMap((s) => s.items);
  const totalEstimated = allItems.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
  const totalActual = allItems.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const remaining = envelope.totalBudget - effectiveSpend;
  const status = getBudgetStatus(effectiveSpend, envelope.totalBudget, envelope.warningThreshold ?? 80);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Open Fundo
          </Link>

          <div className="flex items-start gap-3 mb-1">
            <Wallet className="w-5 h-5 text-primary mt-1 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{envelope.name}</h1>
              {envelope.eventDate && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(envelope.eventDate).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                </div>
              )}
              {envelope.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {envelope.tags.map((t) => (
                    <span key={t} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full mt-2">
            <Eye className="w-3 h-3" /> Read-only snapshot
          </div>
        </div>

        {envelope.notes && (
          <div className="rounded-xl border border-card-border bg-card p-4 mb-4 flex items-start gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm whitespace-pre-line">{envelope.notes}</p>
          </div>
        )}

        <div className={`rounded-xl border p-5 mb-6 bg-card ${status === "danger" ? "border-red-300 dark:border-red-800" : status === "warning" ? "border-amber-300 dark:border-amber-800" : "border-card-border"}`}>
          <div className="mb-3">
            <BudgetProgressBar used={effectiveSpend} total={envelope.totalBudget} height="h-2" showLabel warningAt={envelope.warningThreshold} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground mb-0.5">Budget</div><div className="font-semibold text-lg">{formatPeso(envelope.totalBudget)}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">Estimated</div><div className="font-semibold text-lg">{formatPeso(totalEstimated)}</div></div>
            {totalActual > 0 && <div><div className="text-xs text-muted-foreground mb-0.5">Actual</div><div className="font-semibold text-lg text-primary">{formatPeso(totalActual)}</div></div>}
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Remaining</div>
              <div className={`font-semibold text-lg ${remaining < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{formatPeso(remaining)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {envelope.subcategories.map((sub) => {
            const subEst = sub.items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
            return (
              <div key={sub.id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-card">
                  <div>
                    <span className="font-medium text-sm">{sub.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({sub.items.length} items)</span>
                  </div>
                  <span className="text-sm font-medium">{formatPeso(subEst)}</span>
                </div>
                {sub.items.length > 0 && (
                  <div className="border-t border-border divide-y divide-border">
                    {sub.items.map((item) => {
                      const est = calcEstimatedTotal(item.quantity, item.estimatedUnitPrice);
                      const act = item.actualUnitPrice !== undefined ? calcActualTotal(item.quantity, item.actualUnitPrice) : null;
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.quantity} × {formatPeso(item.estimatedUnitPrice)}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-muted-foreground">Est</div>
                            <div className="font-medium">{formatPeso(est)}</div>
                          </div>
                          {act !== null && (
                            <div className="text-right shrink-0">
                              <div className="text-xs text-muted-foreground">Actual</div>
                              <div className="font-medium text-primary">{formatPeso(act)}</div>
                            </div>
                          )}
                          <StatusBadge status={item.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
