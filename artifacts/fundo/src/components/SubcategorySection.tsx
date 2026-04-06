import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Subcategory, ItemStatus, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";
import { BudgetProgressBar } from "@/components/BudgetProgressBar";
import { ExpenseItemRow } from "@/components/ExpenseItemRow";
import { ExpenseItemDialog } from "@/components/dialogs/ExpenseItemDialog";
import { SubcategoryDialog } from "@/components/dialogs/SubcategoryDialog";
import { Button } from "@/components/ui/button";

interface SubcategorySectionProps {
  envelopeId: string;
  subcategory: Subcategory;
}

export function SubcategorySection({ envelopeId, subcategory }: SubcategorySectionProps) {
  const { deleteSubcategory, deleteItem, updateItem } = useFundo();
  const [expanded, setExpanded] = useState(true);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<string | null>(null);

  const totalEstimated = subcategory.items.reduce(
    (sum, item) => sum + calcEstimatedTotal(item.quantity, item.estimatedUnitPrice),
    0
  );
  const totalActual = subcategory.items.reduce(
    (sum, item) => sum + calcActualTotal(item.quantity, item.actualUnitPrice),
    0
  );
  const effectiveSpend = totalActual > 0 ? totalActual : totalEstimated;
  const allocated = subcategory.allocatedBudget;

  function handleDeleteSub() {
    if (confirm(`Delete category "${subcategory.name}" and all its items?`)) {
      deleteSubcategory(envelopeId, subcategory.id);
    }
  }

  function handleDeleteItem(itemId: string) {
    if (confirm("Delete this item?")) {
      deleteItem(envelopeId, subcategory.id, itemId);
    }
  }

  function handleStatusChange(itemId: string, status: ItemStatus) {
    updateItem(envelopeId, subcategory.id, itemId, { status });
  }

  const editingItem = editItem ? subcategory.items.find((i) => i.id === editItem) : undefined;

  return (
    <div className="border border-border rounded-xl overflow-hidden" data-testid={`section-subcategory-${subcategory.id}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 bg-card cursor-pointer hover:bg-accent/50 transition-colors select-none"
        onClick={() => setExpanded((p) => !p)}
      >
        <button className="text-muted-foreground shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate" data-testid={`text-subcategory-name-${subcategory.id}`}>{subcategory.name}</span>
            <span className="text-xs text-muted-foreground">
              ({subcategory.items.length} {subcategory.items.length === 1 ? "item" : "items"})
            </span>
          </div>
          {allocated !== undefined && (
            <div className="mt-1.5 pr-8">
              <BudgetProgressBar used={effectiveSpend} total={allocated} height="h-1.5" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm shrink-0">
          {allocated !== undefined && (
            <span className="text-muted-foreground text-xs hidden sm:inline">
              {formatPeso(effectiveSpend)} / {formatPeso(allocated)}
            </span>
          )}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setAddItemOpen(true)}
              data-testid={`button-add-item-${subcategory.id}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditSubOpen(true)}
              data-testid={`button-edit-subcategory-${subcategory.id}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDeleteSub}
              data-testid={`button-delete-subcategory-${subcategory.id}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

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
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border">
                <div>Item</div>
                <div className="text-right w-24">Estimated</div>
                <div className="text-right w-24">Actual</div>
                <div className="w-20">Status</div>
                <div className="w-16">Actions</div>
              </div>
              {subcategory.items.map((item) => (
                <ExpenseItemRow
                  key={item.id}
                  item={item}
                  envelopeId={envelopeId}
                  subcategoryId={subcategory.id}
                  onEdit={() => setEditItem(item.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onStatusChange={(status) => handleStatusChange(item.id, status)}
                />
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">Est: <span className="text-foreground font-medium">{formatPeso(totalEstimated)}</span></span>
                  {totalActual > 0 && (
                    <span className="text-muted-foreground">Actual: <span className="text-primary font-medium">{formatPeso(totalActual)}</span></span>
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
