import { useState, useRef } from "react";
import { Pencil, Trash2, Receipt, Building2, CalendarClock, MoveRight } from "lucide-react";
import { ExpenseItem, ItemStatus, Subcategory, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal, getDaysUntil } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusOrder: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];

interface ExpenseItemRowProps {
  item: ExpenseItem;
  envelopeId: string;
  subcategoryId: string;
  allSubcategories: Subcategory[];
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ItemStatus) => void;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

export function ExpenseItemRow({
  item, envelopeId, subcategoryId, allSubcategories,
  onEdit, onDelete, onStatusChange, selected, onSelect, showCheckbox,
}: ExpenseItemRowProps) {
  const { updateItem, moveItem } = useFundo();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const estTotal = calcEstimatedTotal(item.quantity, item.estimatedUnitPrice);
  const actTotal = item.actualUnitPrice !== undefined ? calcActualTotal(item.quantity, item.actualUnitPrice) : null;
  const totalPaid = (item.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const paidPct = actTotal ? Math.min(100, (totalPaid / actTotal) * 100) : estTotal > 0 ? Math.min(100, (totalPaid / estTotal) * 100) : 0;

  const dueIn = item.dueDate ? getDaysUntil(item.dueDate) : null;
  const isDueOverdue = dueIn !== null && dueIn < 0;
  const isDueSoon = dueIn !== null && dueIn >= 0 && dueIn <= 3;

  const otherSubs = allSubcategories.filter((s) => s.id !== subcategoryId);

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

  function handleMove(toSubId: string) {
    moveItem(envelopeId, subcategoryId, item.id, toSubId);
  }

  return (
    <div
      className={`grid gap-x-3 items-start py-3 px-4 border-b last:border-b-0 border-border hover:bg-muted/40 transition-colors text-sm ${showCheckbox ? "grid-cols-[auto_1fr_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto_auto]"}`}
      data-testid={`row-item-${item.id}`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={(e) => onSelect?.(e.target.checked)}
          className="w-4 h-4 accent-primary cursor-pointer mt-1"
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

        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {item.vendor && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title="Vendor">
              <Building2 className="w-2.5 h-2.5" /> {item.vendor}
            </span>
          )}
          {item.receiptRef && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded" title="Receipt">
              <Receipt className="w-2.5 h-2.5" /> {item.receiptRef}
            </span>
          )}
          {item.dueDate && dueIn !== null && (
            <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${isDueOverdue ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400" : isDueSoon ? "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`} title="Due date">
              <CalendarClock className="w-2.5 h-2.5" />
              {isDueOverdue ? `${Math.abs(dueIn)}d overdue` : dueIn === 0 ? "Due today" : `Due in ${dueIn}d`}
            </span>
          )}
          {item.notes && <div className="text-xs text-muted-foreground truncate max-w-40">{item.notes}</div>}
        </div>

        <div className="text-xs text-muted-foreground mt-0.5">
          {item.quantity} &times; {formatPeso(item.estimatedUnitPrice)} est.
          {item.actualUnitPrice !== undefined && ` / ${formatPeso(item.actualUnitPrice)} actual`}
        </div>

        {totalPaid > 0 && (
          <div className="mt-1.5 space-y-0.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatPeso(totalPaid)} paid</span>
              <span>{paidPct.toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${paidPct}%` }} />
            </div>
          </div>
        )}
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

      <div className="flex items-center gap-0.5 shrink-0">
        {otherSubs.length > 0 && (
          <Select onValueChange={handleMove}>
            <SelectTrigger className="h-7 w-7 border-0 shadow-none px-0 [&>svg]:hidden" title="Move to category" data-testid={`button-move-item-${item.id}`}>
              <MoveRight className="w-3.5 h-3.5 text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              <div className="text-xs text-muted-foreground px-2 py-1">Move to…</div>
              {otherSubs.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
