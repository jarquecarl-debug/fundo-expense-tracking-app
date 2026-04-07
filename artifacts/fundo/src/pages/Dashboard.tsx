import { useState, useMemo } from "react";
import { Plus, Wallet, Moon, Sun, Search, SlidersHorizontal, Archive, Database } from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { DashboardSummary } from "@/components/DashboardSummary";
import { OverviewChart } from "@/components/OverviewChart";
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

  const editingEnvelope = editId ? envelopes.find((e) => e.id === editId) : undefined;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    envelopes.forEach((e) => e.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [envelopes]);

  const filtered = useMemo(() => {
    return envelopes.filter((e) => {
      const allItems = e.subcategories.flatMap((s) => s.items);
      const totalEstimated = allItems.reduce((sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0);
      const totalActual = allItems.reduce((sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0);
      const spend = totalActual > 0 ? totalActual : totalEstimated;
      const status = getBudgetStatus(spend, e.totalBudget, e.warningThreshold ?? 80);

      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (tagFilter && !e.tags?.includes(tagFilter)) return false;

      if (filter === "active") return !e.archived;
      if (filter === "archived") return e.archived;
      if (filter === "over-budget") return !e.archived && status === "danger";
      if (filter === "warning") return !e.archived && (status === "warning" || status === "danger");
      return true;
    });
  }, [envelopes, filter, search, tagFilter]);

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

  const filterLabels: Record<FilterKey, string> = {
    all: "All", active: "Active", archived: "Archived", "over-budget": "Over Budget", warning: "At Risk",
  };

  const activeCount = envelopes.filter((e) => !e.archived).length;
  const archivedCount = envelopes.filter((e) => e.archived).length;

  return (
    <div className="min-h-screen bg-background print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Fundo</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {activeCount} active &middot; {archivedCount} archived
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setBackupOpen(true)} title="Data management" data-testid="button-data-management">
              <Database className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"} data-testid="button-toggle-dark">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-envelope">
              <Plus className="w-4 h-4 mr-2" /> New Envelope
            </Button>
          </div>
        </div>

        <DashboardSummary envelopes={envelopes} />
        <OverviewChart envelopes={envelopes} />

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search envelopes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-36 h-9" data-testid="select-sort">
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

        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "active", "archived", "over-budget", "warning"] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"} ${f === "over-budget" && filter !== f ? "text-red-500" : ""} ${f === "warning" && filter !== f ? "text-amber-600 dark:text-amber-400" : ""}`}
              data-testid={`filter-${f}`}
            >
              {filterLabels[f]}
            </button>
          ))}
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tagFilter === tag ? "bg-primary/80 text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"}`}
              data-testid={`tag-filter-${tag}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              {filter === "archived" ? <Archive className="w-8 h-8 text-muted-foreground" /> : <Wallet className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {search ? `No results for "${search}"` : filter === "archived" ? "No archived envelopes" : filter === "over-budget" ? "No over-budget envelopes" : "No envelopes yet"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              {!search && filter === "active" && "Create an envelope to start tracking your budget — for events, household bills, or anything else."}
            </p>
            {!search && filter === "active" && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-envelope">
                <Plus className="w-4 h-4 mr-2" /> Create First Envelope
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                onEdit={() => setEditId(envelope.id)}
                onDelete={() => handleDelete(envelope.id, envelope.name)}
              />
            ))}
          </div>
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
