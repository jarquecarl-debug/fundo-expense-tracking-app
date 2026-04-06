import { useState, useRef } from "react";
import { Pencil, Trash2, Receipt } from "lucide-react";
import { ExpenseItem, ItemStatus, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

const statusOrder: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];

interface ExpenseItemRowProps {
  item: ExpenseItem;
  envelopeId: string;
  subcategoryId: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ItemStatus) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

export function ExpenseItemRow({ item, envelopeId, subcategoryId, onEdit, onDelete, onStatusChange, selected, onSelect, showCheckbox }: ExpenseItemRowProps) {
  const { updateItem } = useFundo();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const estTotal = calcEstimatedTotal(item.quantity, item.estimatedUnitPrice);
  const actTotal = item.actualUnitPrice !== undefined ? calcActualTotal(item.quantity, item.actualUnitPrice) : null;

  function cycleStatus() {
    const idx = statusOrder.indexOf(item.status);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    onStatusChange(next);
  }

  function startEditName() {
    setNameValue(item.name);
    setEditingName(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== item.name) {
      updateItem(envelopeId, subcategoryId, item.id, { name: trimmed });
    }
    setEditingName(false);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitName();
    if (e.key === "Escape") { setEditingName(false); setNameValue(item.name); }
  }

  return (
    <div
      className={`grid gap-x-3 items-center py-3 px-4 border-b last:border-b-0 border-border hover:bg-muted/40 transition-colors text-sm ${showCheckbox ? "grid-cols-[auto_1fr_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto]"}`}
      data-testid={`row-item-${item.id}`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={(e) => onSelect?.(e.target.checked)}
          className="w-4 h-4 accent-primary cursor-pointer"
          data-testid={`checkbox-item-${item.id}`}
        />
      )}

      <div className="min-w-0">
        {editingName ? (
          <input
            ref={inputRef}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            className="w-full font-medium bg-background border border-primary rounded px-1 py-0.5 text-sm outline-none"
            data-testid={`input-inline-name-${item.id}`}
          />
        ) : (
          <div
            className="font-medium truncate cursor-text hover:text-primary transition-colors"
            title="Click to edit name"
            onClick={startEditName}
            data-testid={`text-item-name-${item.id}`}
          >
            {item.name}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.receiptRef && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Receipt className="w-2.5 h-2.5" /> {item.receiptRef}
            </span>
          )}
          {item.notes && (
            <div className="text-xs text-muted-foreground truncate">{item.notes}</div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {item.quantity} &times; {formatPeso(item.estimatedUnitPrice)} est.
          {item.actualUnitPrice !== undefined && ` / ${formatPeso(item.actualUnitPrice)} actual`}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">Est</div>
        <div className="font-medium" data-testid={`text-item-estimated-${item.id}`}>{formatPeso(estTotal)}</div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">Actual</div>
        <div className={`font-medium ${actTotal !== null ? "text-primary" : "text-muted-foreground"}`} data-testid={`text-item-actual-${item.id}`}>
          {actTotal !== null ? formatPeso(actTotal) : "—"}
        </div>
      </div>

      <div className="shrink-0">
        <StatusBadge status={item.status} onClick={cycleStatus} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} data-testid={`button-edit-item-${item.id}`}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} data-testid={`button-delete-item-${item.id}`}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
