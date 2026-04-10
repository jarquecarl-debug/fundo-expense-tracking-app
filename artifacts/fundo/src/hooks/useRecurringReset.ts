import { useEffect } from "react";
import { useFundo } from "@/context/FundoContext";

const STORAGE_KEY = "fundo_last_recurring_reset";

/**
 * Checks on every app load whether we've passed the 1st of the month
 * since the last reset. If yes, resets all recurring items:
 *   - status → "Unordered"
 *   - dueDate → 1st of the new current month
 *   - payments cleared
 */
export function useRecurringReset() {
  const { envelopes, updateItem } = useFundo();

  useEffect(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastReset = localStorage.getItem(STORAGE_KEY);

    // Already reset this month — do nothing
    if (lastReset === thisMonthKey) return;

    // It's a new month — find and reset all recurring items
    let didReset = false;

    for (const envelope of envelopes) {
      for (const sub of envelope.subcategories) {
        for (const item of sub.items) {
          const isRecurring = (item as typeof item & { recurring?: boolean }).recurring;
          if (!isRecurring) continue;

          // New due date: 1st of current month
          const newDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

          updateItem(envelope.id, sub.id, item.id, {
            status: "Unordered",
            dueDate: newDueDate,
            payments: [],
          });

          didReset = true;
        }
      }
    }

    if (didReset || lastReset !== thisMonthKey) {
      localStorage.setItem(STORAGE_KEY, thisMonthKey);
    }
  // Run once on mount — intentionally no deps array change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}