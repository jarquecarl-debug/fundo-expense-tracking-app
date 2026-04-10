import { useState, useRef } from "react";
import { Pencil, Trash2, Receipt, Building2, CalendarClock, MoveRight, Flag } from "lucide-react";
import { ExpenseItem, ItemStatus, ItemPriority, Subcategory, useFundo } from "@/context/FundoContext";
import { formatPeso, calcActualTotal, calcEstimatedTotal, getDaysUntil } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusOrder: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];
const priorityColor: Record<ItemPriority, string> = {
  low: "text-blue-500",
  medium: "text-amber-500",
  high: "text-red-500",
};

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
  const actTotal = item.actualUnitPrice !== undefined
    ? calcActualTotal(item.quantity, item.actualUnitPrice)
    : null;
  const totalPaid = (item.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const paidPct = actTotal
    ? Math.min(100, (totalPaid / actTotal) * 100)
    : estTotal > 0 ? Math.min(100, (totalPaid / estTotal) * 100) : 0;
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
      className="py-3 px-4 border-b last:border-b-0 border-border hover:bg-muted/40 transition-colors text-sm"
      data-testid={`row-item-${item.id}`}
    >
      {/* ── Top row: checkbox + name + actions ── */}
      <div className="flex items-start gap-2">
        {showCheckbox && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={(e) => onSelect?.(e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer mt-0.5 shrink-0"
            data-testid={`checkbox-item-${item.id}`}
          />
        )}

        {/* Name block — fills all available space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.priority && (
              <span title={`Priority: ${item.priority}`} className="shrink-0 flex items-center">
                <Flag className={`w-3 h-3 ${priorityColor[item.priority]}`} />
              </span>
            )}
            {(item as typeof item & { recurring?: boolean }).recurring && (
              <span title="Recurring — resets monthly" className="text-primary">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
                  <path d="M9 5.5A3.5 3.5 0 1 1 5.5 2H7M7 2L5.5.5M7 2L5.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
            {editingName ? (
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={handleNameKeyDown}
                className="flex-1 font-medium bg-background border border-primary rounded px-1 py-0.5 text-sm outline-none"
                data-testid={`input-inline-name-${item.id}`}
              />
            ) : (
              <div
                className="font-medium truncate cursor-text hover:text-primary transition-colors"
                title={item.name}
                onClick={startEditName}
                data-testid={`text-item-name-${item.id}`}
              >
                {item.name}
              </div>
            )}
          </div>

          {/* Vendor / receipt / due date chips */}
          {(item.vendor || item.receiptRef || item.dueDate) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {item.vendor && (
                <span
                  className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                  title="Vendor"
                >
                  <Building2 className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[7.5rem]">{item.vendor}</span>
                </span>
              )}
              {item.receiptRef && (
                <span
                  className="flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                  title="Receipt"
                >
                  <Receipt className="w-2.5 h-2.5 shrink-0" /> {item.receiptRef}
                </span>
              )}
              {item.dueDate && dueIn !== null && item.status !== "Paid" && item.status !== "Received" && (
                <span
                  className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                    isDueOverdue
                      ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                      : isDueSoon
                      ? "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                  title="Due date"
                >
                  <CalendarClock className="w-2.5 h-2.5 shrink-0" />
                  {isDueOverdue
                    ? `${Math.abs(dueIn)}d overdue`
                    : dueIn === 0
                    ? "Due today"
                    : `Due in ${dueIn}d`}
                </span>
              )}
            </div>
          )}

          {item.notes && (
            <div className="text-xs text-muted-foreground truncate mt-0.5 max-w-xs sm:max-w-none">
              {item.notes}
            </div>
          )}

          {/* Quantity × price line */}
          <div className="text-xs text-muted-foreground mt-0.5">
            {item.quantity} &times; {formatPeso(item.estimatedUnitPrice)} est.
            {item.actualUnitPrice !== undefined && (
              <> / {formatPeso(item.actualUnitPrice)} actual</>
            )}
          </div>

          {/* Paid progress bar */}
          {totalPaid > 0 && (
            <div className="mt-1.5 space-y-0.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPeso(totalPaid)} paid</span>
                <span>{paidPct.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons — always on the right of the name */}
        <div className="flex items-center gap-0.5 shrink-0">
          {otherSubs.length > 0 && (
            <Select onValueChange={handleMove}>
              <SelectTrigger
                className="h-7 w-7 border-0 shadow-none px-0 [&>svg]:hidden"
                title="Move to category"
                data-testid={`button-move-item-${item.id}`}
              >
                <MoveRight className="w-3.5 h-3.5 text-muted-foreground" />
              </SelectTrigger>
              <SelectContent>
                <div className="text-xs text-muted-foreground px-2 py-1">Move to…</div>
                {otherSubs.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            data-testid={`button-edit-item-${item.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-item-${item.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Bottom row: Est / Actual / Status badge ── */}
      {/*
        On mobile (< sm): full-width flex row, left-aligned labels + values,
        status badge pushed to end.
        On sm+: same row but tighter since the name column is wider anyway.
      */}
      <div className="flex items-center gap-3 mt-2 pl-6">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Est</span>
          <span className="font-medium" data-testid={`text-item-estimated-${item.id}`}>
            {formatPeso(estTotal)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Actual</span>
          <span
            className={`font-medium ${actTotal !== null ? "text-primary" : "text-muted-foreground"}`}
            data-testid={`text-item-actual-${item.id}`}
          >
            {actTotal !== null ? formatPeso(actTotal) : "—"}
          </span>
        </div>

        {/* Status badge — pushed to the right */}
        <div className="ml-auto">
          <StatusBadge status={item.status} onClick={cycleStatus} />
        </div>
      </div>
    </div>
  );
}