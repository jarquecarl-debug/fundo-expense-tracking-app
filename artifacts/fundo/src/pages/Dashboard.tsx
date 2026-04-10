import { useState, useMemo } from "react";
import { Plus, Wallet, Moon, Sun, Search, SlidersHorizontal, Archive, Database, BarChart3, X } from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { DashboardSummary } from "@/components/DashboardSummary";
import { OverviewChart } from "@/components/OverviewChart";
import { MonthlySummary } from "@/components/MonthlySummary";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { EnvelopeDialog } from "@/components/dialogs/EnvelopeDialog";
import { BackupDialog } from "@/components/dialogs/BackupDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcActualTotal, calcEstimatedTotal, getBudgetStatus } from "@/lib/format";
import { toast } from "sonner";

type SortKey = "name" | "budget" | "date" | "remaining" | "created";
type FilterKey = "all" | "active" | "archived" | "over-budget" | "warning";
type DateFilter = "all" | "this-month" | "last-month" | "this-year" | "custom";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  "all": "Any date",
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
  "custom": "Custom range",
};

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (filter === "this-month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
  }
  if (filter === "last-month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0),
    };
  }
  if (filter === "this-year") {
    return {
      from: new Date(now.getFullYear(), 0, 1),
      to: new Date(now.getFullYear(), 11, 31),
    };
  }
  if (filter === "custom" && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }
  return { from: null, to: null };
}

export default function Dashboard() {
  const { envelopes, deleteEnvelope, restoreEnvelope } = useFundo();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [filter, setFilter] = useState<FilterKey>("active");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showMonthly, setShowMonthly] = useState(false);

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const editingEnvelope = editId ? envelopes.find((e) => e.id === editId) : undefined;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    envelopes.forEach((e) => e.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [envelopes]);

  const dateRange = useMemo(
    () => getDateRange(dateFilter, customFrom, customTo),
    [dateFilter, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    return envelopes.filter((e) => {
      const allItems = e.subcategories.flatMap((s) => s.items);
      const totalActual = allItems.reduce((sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0);
      const totalEstimated = allItems.reduce((sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0);
      const spend = totalActual > 0 ? totalActual : totalEstimated;
      const status = getBudgetStatus(spend, e.totalBudget, e.warningThreshold ?? 80);

      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (tagFilter && !e.tags?.includes(tagFilter)) return false;

      // Date filter
      if (dateRange.from || dateRange.to) {
        const created = new Date(e.createdAt);
        if (dateRange.from && created < dateRange.from) return false;
        if (dateRange.to && created > dateRange.to) return false;
      }

      if (filter === "active") return !e.archived;
      if (filter === "archived") return e.archived;
      if (filter === "over-budget") return !e.archived && status === "danger";
      if (filter === "warning") return !e.archived && (status === "warning" || status === "danger");
      return true;
    });
  }, [envelopes, filter, search, tagFilter, dateRange]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "budget") return b.totalBudget - a.totalBudget;
      if (sortKey === "date") {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      if (sortKey === "remaining") {
        const rem = (e: typeof a) => {
          const items = e.subcategories.flatMap((s) => s.items);
          const est = items.reduce((s, i) => s + calcEstimatedTotal(i.quantity, i.estimatedUnitPrice), 0);
          const act = items.reduce((s, i) => s + calcActualTotal(i.quantity, i.actualUnitPrice), 0);
          return e.totalBudget - (act > 0 ? act : est);
        };
        return rem(a) - rem(b);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filtered, sortKey]);

  function handleDelete(id: string, name: string) {
    const envelope = envelopes.find((e) => e.id === id);
    if (!envelope) return;
    deleteEnvelope(id);
    toast(`"${name}" deleted`, {
      action: { label: "Undo", onClick: () => restoreEnvelope(envelope) },
      duration: 5000,
    });
  }

  function clearDateFilter() {
    setDateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setShowDatePicker(false);
  }

  const filterLabels: Record<FilterKey, string> = {
    all: "All", active: "Active", archived: "Archived", "over-budget": "Over Budget", warning: "At Risk",
  };

  const activeCount = envelopes.filter((e) => !e.archived).length;
  const archivedCount = envelopes.filter((e) => e.archived).length;
  const hasDateFilter = dateFilter !== "all";

  return (
    <div className="min-h-screen bg-background print:hidden">

      {/* ── Hero Header with dot-grid ─────────────────────── */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/0 to-background pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="animate-fundo-slide">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md animate-pulse-glow">
                  <Wallet className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight gradient-text">Fundo</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{activeCount}</span> active
                &nbsp;·&nbsp;
                <span className="text-muted-foreground">{archivedCount} archived</span>
              </p>
            </div>

            <div className="flex items-center gap-2 animate-fundo-in">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMonthly((p) => !p)}
                title="Monthly summary"
                className={showMonthly ? "bg-primary/10 border-primary/40 text-primary" : ""}
                data-testid="button-monthly-summary"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setBackupOpen(true)} title="Data management" data-testid="button-data-management">
                <Database className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"} data-testid="button-toggle-dark">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 shadow-sm"
                data-testid="button-create-envelope"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Envelope</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Summary cards */}
        <div className="animate-fundo-in" style={{ animationDelay: "60ms" }}>
          <DashboardSummary envelopes={envelopes} />
        </div>

        {/* Overview chart */}
        <div className="animate-fundo-in" style={{ animationDelay: "120ms" }}>
          <OverviewChart envelopes={envelopes} />
        </div>

        {/* Monthly Summary (toggleable) */}
        {showMonthly && (
          <div className="animate-fundo-scale">
            <MonthlySummary envelopes={envelopes} />
          </div>
        )}

        {/* ── Search + Sort + Date Filter ───────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-fundo-in" style={{ animationDelay: "180ms" }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search envelopes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 focus-glow"
              data-testid="input-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Date Filter */}
            <div className="relative">
              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v as DateFilter);
                  if (v === "custom") setShowDatePicker(true);
                  else setShowDatePicker(false);
                }}
              >
                <SelectTrigger
                  className={`h-9 w-36 text-xs ${hasDateFilter ? "border-primary/50 bg-primary/5 text-primary" : ""}`}
                  data-testid="select-date-filter"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATE_FILTER_LABELS) as DateFilter[]).map((f) => (
                    <SelectItem key={f} value={f} className="text-xs">{DATE_FILTER_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-36 h-9 text-xs" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">Newest first</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="budget">Budget (high–low)</SelectItem>
                  <SelectItem value="date">Event date</SelectItem>
                  <SelectItem value="remaining">Remaining (low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Custom date range picker */}
        {dateFilter === "custom" && showDatePicker && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-primary/30 bg-primary/5 animate-fundo-scale">
            <span className="text-xs text-muted-foreground font-medium shrink-0">From</span>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground font-medium shrink-0">To</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <button
              onClick={clearDateFilter}
              className="text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active date filter badge */}
        {hasDateFilter && dateFilter !== "custom" && (
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-medium">
              📅 {DATE_FILTER_LABELS[dateFilter]}
              <button onClick={clearDateFilter} className="hover:text-primary/60">
                <X className="w-3 h-3" />
              </button>
            </span>
            <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* ── Filter Pills ──────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5 animate-fundo-in" style={{ animationDelay: "220ms" }}>
          {(["all", "active", "archived", "over-budget", "warning"] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : f === "over-budget"
                  ? "bg-muted text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                  : f === "warning"
                  ? "bg-muted text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              data-testid={`filter-${f}`}
            >
              {filterLabels[f]}
            </button>
          ))}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                tagFilter === tag
                  ? "bg-primary/80 text-primary-foreground shadow-sm"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              }`}
              data-testid={`tag-filter-${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* ── Envelope Grid ─────────────────────────────── */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fundo-in">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              {filter === "archived" ? <Archive className="w-8 h-8 text-muted-foreground" /> : <Wallet className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {search
                ? `No results for "${search}"`
                : hasDateFilter
                ? "No envelopes in this period"
                : filter === "archived"
                ? "No archived envelopes"
                : filter === "over-budget"
                ? "No over-budget envelopes"
                : "No envelopes yet"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              {!search && !hasDateFilter && filter === "active" &&
                "Create an envelope to start tracking your budget — for events, subscriptions, or anything else."}
            </p>
            {!search && !hasDateFilter && filter === "active" && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-envelope">
                <Plus className="w-4 h-4 mr-2" /> Create First Envelope
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              Showing <span className="text-foreground font-medium">{sorted.length}</span> envelope{sorted.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
              {sorted.map((envelope) => (
                <div key={envelope.id} className="animate-fundo-in">
                  <EnvelopeCard
                    envelope={envelope}
                    onEdit={() => setEditId(envelope.id)}
                    onDelete={() => handleDelete(envelope.id, envelope.name)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <QuickAddDialog />
      <EnvelopeDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editingEnvelope && (
        <EnvelopeDialog open={!!editId} onClose={() => setEditId(null)} envelope={editingEnvelope} />
      )}
      <BackupDialog open={backupOpen} onClose={() => setBackupOpen(false)} />
    </div>
  );
}