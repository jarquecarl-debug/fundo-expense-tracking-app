import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, CheckSquare, ArrowUpDown } from "lucide-react";
import { Subcategory, ItemStatus, ItemPriority, ExpenseItem, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { ExpenseItemRow } from "@/components/ExpenseItemRow";
import { ExpenseItemDialog } from "@/components/dialogs/ExpenseItemDialog";
import { SubcategoryDialog } from "@/components/dialogs/SubcategoryDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const statusOptions: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];
const priorityOrder: Record<ItemPriority | "none", number> = { high: 0, medium: 1, low: 2, none: 3 };

type SortMode = "default" | "priority" | "status" | "name";

interface SubcategorySectionProps {
  envelopeId: string;
  subcategory: Subcategory;
  allSubcategories: Subcategory[];
}

export function SubcategorySection({ envelopeId, subcategory, allSubcategories }: SubcategorySectionProps) {
  const { deleteSubcategory, deleteItem, updateItem, restoreItem, restoreSubcategory, bulkUpdateStatus } = useFundo();
  const [expanded, setExpanded] = useState(true);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>("Paid");
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const totalEstimated = subcategory.items.reduce(
    (sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice), 0
  );
  const totalActual = subcategory.items.reduce(
    (sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice), 0
  );
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const allocated = subcategory.allocatedBudget;
  const showCheckboxes = selectedIds.size > 0;

  const sortedItems = [...subcategory.items].sort((a, b) => {
    if (sortMode === "priority") {
      const pa = priorityOrder[a.priority ?? "none"];
      const pb = priorityOrder[b.priority ?? "none"];
      return pa - pb;
    }
    if (sortMode === "status") return statusOptions.indexOf(a.status) - statusOptions.indexOf(b.status);
    if (sortMode === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  function handleDeleteSub() {
    const copy = { ...subcategory };
    deleteSubcategory(envelopeId, subcategory.id);
    toast(`Category "${subcategory.name}" deleted`, {
      action: { label: "Undo", onClick: () => restoreSubcategory(envelopeId, copy) },
      duration: 5000,
    });
  }

  function handleDeleteItem(item: ExpenseItem) {
    const copy = { ...item };
    deleteItem(envelopeId, subcategory.id, item.id);
    toast(`"${item.name}" deleted`, {
      action: { label: "Undo", onClick: () => restoreItem(envelopeId, subcategory.id, copy) },
      duration: 5000,
    });
  }

  function handleStatusChange(itemId: string, status: ItemStatus) {
    updateItem(envelopeId, subcategory.id, itemId, { status });
  }

  function toggleSelect(itemId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(itemId); else next.delete(itemId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === subcategory.items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(subcategory.items.map((i) => i.id)));
  }

  function applyBulkStatus() {
    const ids = Array.from(selectedIds);
    bulkUpdateStatus(envelopeId, subcategory.id, ids, bulkStatus);
    toast.success(`${ids.length} item${ids.length !== 1 ? "s" : ""} set to ${bulkStatus}`);
    setSelectedIds(new Set());
  }

  const editingItem = editItem ? subcategory.items.find((i) => i.id === editItem) : undefined;

  return (
    <div
      className="border border-border rounded-xl overflow-hidden"
      data-testid={`section-subcategory-${subcategory.id}`}
    >
      {/* ── Category header ── */}
      <div
        className="flex items-center gap-2 px-3 py-3 bg-card cursor-pointer hover:bg-accent/50 transition-colors select-none sm:gap-3 sm:px-4"
        onClick={() => setExpanded((p) => !p)}
      >
        <button className="text-muted-foreground shrink-0">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-medium text-sm truncate"
              data-testid={`text-subcategory-name-${subcategory.id}`}
            >
              {subcategory.name}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              ({subcategory.items.length} {subcategory.items.length === 1 ? "item" : "items"})
            </span>
          </div>
          {allocated !== undefined && (
            <div className="mt-1.5 pr-2">
              <BudgetProgressBar used={effectiveSpend} total={allocated} height="h-1.5" />
            </div>
          )}
          {/* Budget label: visible only on sm+ inline with progress */}
          {allocated !== undefined && (
            <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">
              {formatPeso(effectiveSpend)} / {formatPeso(allocated)}
            </p>
          )}
        </div>

        {/* Action icons — stop propagation so they don't toggle expand */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setAddItemOpen(true)}
            title="Add item"
            data-testid={`button-add-item-${subcategory.id}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditSubOpen(true)}
            title="Edit category"
            data-testid={`button-edit-subcategory-${subcategory.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDeleteSub}
            title="Delete category"
            data-testid={`button-delete-subcategory-${subcategory.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="bg-card border-t border-border">
          {subcategory.items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No items yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setAddItemOpen(true)}
                data-testid={`button-add-first-item-${subcategory.id}`}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add First Item
              </Button>
            </div>
          ) : (
            <>
              {/* Select-all + sort toolbar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border sm:px-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`button-select-all-${subcategory.id}`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {selectedIds.size === subcategory.items.length && subcategory.items.length > 0
                    ? "Deselect all"
                    : "Select all"}
                </button>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="h-6 w-28 text-xs border-0 shadow-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">Default</SelectItem>
                      <SelectItem value="priority" className="text-xs">By Priority</SelectItem>
                      <SelectItem value="status" className="text-xs">By Status</SelectItem>
                      <SelectItem value="name" className="text-xs">By Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bulk-action bar */}
              {showCheckboxes && (
                <div
                  className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border sm:gap-3 sm:px-4"
                  data-testid="bulk-action-bar"
                >
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <span className="text-muted-foreground text-sm hidden xs:inline">Set to:</span>
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ItemStatus)}>
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={applyBulkStatus}
                    data-testid="button-bulk-apply"
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Item rows */}
              {sortedItems.map((item) => (
                <ExpenseItemRow
                  key={item.id}
                  item={item}
                  envelopeId={envelopeId}
                  subcategoryId={subcategory.id}
                  allSubcategories={allSubcategories}
                  onEdit={() => setEditItem(item.id)}
                  onDelete={() => handleDeleteItem(item)}
                  onStatusChange={(status) => handleStatusChange(item.id, status)}
                  selected={selectedIds.has(item.id)}
                  onSelect={(checked) => toggleSelect(item.id, checked)}
                  showCheckbox
                />
              ))}

              {/* Subtotal row */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30 border-t border-border text-sm sm:px-4">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-muted-foreground">
                    Est:{" "}
                    <span className="text-foreground font-medium">
                      {formatPeso(totalEstimated)}
                    </span>
                  </span>
                  {totalActual > 0 && (
                    <span className="text-muted-foreground">
                      Actual:{" "}
                      <span className="text-primary font-medium">
                        {formatPeso(totalActual)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <SubcategoryDialog
        open={editSubOpen}
        onClose={() => setEditSubOpen(false)}
        envelopeId={envelopeId}
        subcategory={subcategory}
      />
      <ExpenseItemDialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        envelopeId={envelopeId}
        subcategoryId={subcategory.id}
      />
      {editingItem && (
        <ExpenseItemDialog
          open={!!editItem}
          onClose={() => setEditItem(null)}
          envelopeId={envelopeId}
          subcategoryId={subcategory.id}
          item={editingItem}
        />
      )}
    </div>
  );
}