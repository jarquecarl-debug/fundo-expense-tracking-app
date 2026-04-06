import { Pencil, Trash2 } from "lucide-react";
import { ExpenseItem, ItemStatus } from "@/context/FundoContext";
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
}

export function ExpenseItemRow({ item, onEdit, onDelete, onStatusChange }: ExpenseItemRowProps) {
  const estTotal = calcEstimatedTotal(item.quantity, item.estimatedUnitPrice);
  const actTotal = item.actualUnitPrice !== undefined ? calcActualTotal(item.quantity, item.actualUnitPrice) : null;

  function cycleStatus() {
    const idx = statusOrder.indexOf(item.status);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    onStatusChange(next);
  }

  return (
    <div
      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 items-center py-3 px-4 border-b last:border-b-0 border-border hover:bg-muted/40 transition-colors text-sm"
      data-testid={`row-item-${item.id}`}
    >
      <div className="min-w-0">
        <div className="font-medium truncate" data-testid={`text-item-name-${item.id}`}>{item.name}</div>
        {item.notes && (
          <div className="text-xs text-muted-foreground truncate">{item.notes}</div>
        )}
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
