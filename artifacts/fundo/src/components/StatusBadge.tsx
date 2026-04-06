import { ItemStatus } from "@/context/FundoContext";

interface StatusBadgeProps {
  status: ItemStatus;
  onClick?: () => void;
}

const statusConfig: Record<ItemStatus, { label: string; className: string }> = {
  Unordered: { label: "Unordered", className: "bg-muted text-muted-foreground border-muted-border" },
  Ordered: { label: "Ordered", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  Received: { label: "Received", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  Paid: { label: "Paid", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
};

export function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const { label, className } = statusConfig[status];
  return (
    <span
      data-testid={`status-badge-${status.toLowerCase()}`}
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className} ${onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
    >
      {label}
    </span>
  );
}
