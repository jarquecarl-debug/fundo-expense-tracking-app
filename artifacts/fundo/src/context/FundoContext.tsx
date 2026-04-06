import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ItemStatus = "Unordered" | "Ordered" | "Received" | "Paid";

export interface HistoryEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  quantity: number;
  estimatedUnitPrice: number;
  actualUnitPrice?: number;
  notes?: string;
  receiptRef?: string;
  status: ItemStatus;
}

export interface Subcategory {
  id: string;
  name: string;
  allocatedBudget?: number;
  items: ExpenseItem[];
}

export interface Envelope {
  id: string;
  name: string;
  totalBudget: number;
  eventDate?: string;
  subcategories: Subcategory[];
  createdAt: string;
  archived: boolean;
  tags: string[];
  history: HistoryEvent[];
}

interface FundoContextValue {
  envelopes: Envelope[];
  addEnvelope: (data: Omit<Envelope, "id" | "subcategories" | "createdAt" | "archived" | "history">) => Envelope;
  updateEnvelope: (id: string, data: Partial<Omit<Envelope, "id" | "subcategories" | "createdAt" | "archived" | "history">>) => void;
  deleteEnvelope: (id: string) => void;
  restoreEnvelope: (envelope: Envelope) => void;
  archiveEnvelope: (id: string, archived: boolean) => void;
  duplicateEnvelope: (id: string) => void;
  addSubcategory: (envelopeId: string, data: Omit<Subcategory, "id" | "items">) => Subcategory;
  updateSubcategory: (envelopeId: string, subId: string, data: Partial<Omit<Subcategory, "id" | "items">>) => void;
  deleteSubcategory: (envelopeId: string, subId: string) => void;
  restoreSubcategory: (envelopeId: string, sub: Subcategory) => void;
  addItem: (envelopeId: string, subId: string, data: Omit<ExpenseItem, "id">) => ExpenseItem;
  updateItem: (envelopeId: string, subId: string, itemId: string, data: Partial<Omit<ExpenseItem, "id">>) => void;
  deleteItem: (envelopeId: string, subId: string, itemId: string) => void;
  restoreItem: (envelopeId: string, subId: string, item: ExpenseItem) => void;
  bulkUpdateStatus: (envelopeId: string, subId: string, itemIds: string[], status: ItemStatus) => void;
}

const STORAGE_KEY = "fundo_envelopes";

function loadEnvelopes(): Envelope[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Envelope[];
    return parsed.map((e) => ({
      archived: false,
      tags: [],
      history: [],
      ...e,
    }));
  } catch {
    return [];
  }
}

function saveEnvelopes(envelopes: Envelope[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelopes));
}

function makeEvent(type: string, description: string): HistoryEvent {
  return { id: crypto.randomUUID(), type, description, timestamp: new Date().toISOString() };
}

const FundoContext = createContext<FundoContextValue | null>(null);

export function FundoProvider({ children }: { children: ReactNode }) {
  const [envelopes, setEnvelopes] = useState<Envelope[]>(() => loadEnvelopes());

  const persist = useCallback((next: Envelope[]) => {
    setEnvelopes(next);
    saveEnvelopes(next);
  }, []);

  const addHistoryToEnvelope = (envs: Envelope[], envelopeId: string, event: HistoryEvent): Envelope[] =>
    envs.map((e) =>
      e.id === envelopeId ? { ...e, history: [event, ...e.history].slice(0, 50) } : e
    );

  const addEnvelope = useCallback(
    (data: Omit<Envelope, "id" | "subcategories" | "createdAt" | "archived" | "history">) => {
      const envelope: Envelope = {
        ...data,
        id: crypto.randomUUID(),
        subcategories: [],
        createdAt: new Date().toISOString(),
        archived: false,
        history: [makeEvent("envelope_created", `Envelope "${data.name}" created`)],
      };
      persist([...envelopes, envelope]);
      return envelope;
    },
    [envelopes, persist]
  );

  const updateEnvelope = useCallback(
    (id: string, data: Partial<Omit<Envelope, "id" | "subcategories" | "createdAt" | "archived" | "history">>) => {
      const updated = envelopes.map((e) => (e.id === id ? { ...e, ...data } : e));
      const withHistory = addHistoryToEnvelope(updated, id, makeEvent("envelope_updated", "Envelope details updated"));
      persist(withHistory);
    },
    [envelopes, persist]
  );

  const deleteEnvelope = useCallback(
    (id: string) => persist(envelopes.filter((e) => e.id !== id)),
    [envelopes, persist]
  );

  const restoreEnvelope = useCallback(
    (envelope: Envelope) => persist([...envelopes, envelope]),
    [envelopes, persist]
  );

  const archiveEnvelope = useCallback(
    (id: string, archived: boolean) => {
      const updated = envelopes.map((e) => (e.id === id ? { ...e, archived } : e));
      const withHistory = addHistoryToEnvelope(
        updated, id,
        makeEvent("archive_changed", archived ? "Envelope archived" : "Envelope restored from archive")
      );
      persist(withHistory);
    },
    [envelopes, persist]
  );

  const duplicateEnvelope = useCallback(
    (id: string) => {
      const original = envelopes.find((e) => e.id === id);
      if (!original) return;
      const duplicate: Envelope = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (copy)`,
        createdAt: new Date().toISOString(),
        archived: false,
        history: [makeEvent("envelope_created", `Duplicated from "${original.name}"`)],
        subcategories: original.subcategories.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
          items: s.items.map((i) => ({ ...i, id: crypto.randomUUID(), status: "Unordered" as ItemStatus })),
        })),
      };
      persist([...envelopes, duplicate]);
    },
    [envelopes, persist]
  );

  const addSubcategory = useCallback(
    (envelopeId: string, data: Omit<Subcategory, "id" | "items">) => {
      const sub: Subcategory = { ...data, id: crypto.randomUUID(), items: [] };
      const updated = envelopes.map((e) =>
        e.id === envelopeId ? { ...e, subcategories: [...e.subcategories, sub] } : e
      );
      const withHistory = addHistoryToEnvelope(updated, envelopeId, makeEvent("subcategory_added", `Category "${data.name}" added`));
      persist(withHistory);
      return sub;
    },
    [envelopes, persist]
  );

  const updateSubcategory = useCallback(
    (envelopeId: string, subId: string, data: Partial<Omit<Subcategory, "id" | "items">>) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? { ...e, subcategories: e.subcategories.map((s) => (s.id === subId ? { ...s, ...data } : s)) }
            : e
        )
      );
    },
    [envelopes, persist]
  );

  const deleteSubcategory = useCallback(
    (envelopeId: string, subId: string) => {
      const envelope = envelopes.find((e) => e.id === envelopeId);
      const sub = envelope?.subcategories.find((s) => s.id === subId);
      const updated = envelopes.map((e) =>
        e.id === envelopeId
          ? { ...e, subcategories: e.subcategories.filter((s) => s.id !== subId) }
          : e
      );
      const withHistory = addHistoryToEnvelope(updated, envelopeId, makeEvent("subcategory_deleted", `Category "${sub?.name ?? "?"}" deleted`));
      persist(withHistory);
    },
    [envelopes, persist]
  );

  const restoreSubcategory = useCallback(
    (envelopeId: string, sub: Subcategory) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId ? { ...e, subcategories: [...e.subcategories, sub] } : e
        )
      );
    },
    [envelopes, persist]
  );

  const addItem = useCallback(
    (envelopeId: string, subId: string, data: Omit<ExpenseItem, "id">) => {
      const item: ExpenseItem = { ...data, id: crypto.randomUUID() };
      const updated = envelopes.map((e) =>
        e.id === envelopeId
          ? {
              ...e,
              subcategories: e.subcategories.map((s) =>
                s.id === subId ? { ...s, items: [...s.items, item] } : s
              ),
            }
          : e
      );
      const withHistory = addHistoryToEnvelope(updated, envelopeId, makeEvent("item_added", `Item "${data.name}" added`));
      persist(withHistory);
      return item;
    },
    [envelopes, persist]
  );

  const updateItem = useCallback(
    (envelopeId: string, subId: string, itemId: string, data: Partial<Omit<ExpenseItem, "id">>) => {
      const envelope = envelopes.find((e) => e.id === envelopeId);
      const sub = envelope?.subcategories.find((s) => s.id === subId);
      const item = sub?.items.find((i) => i.id === itemId);
      const updated = envelopes.map((e) =>
        e.id === envelopeId
          ? {
              ...e,
              subcategories: e.subcategories.map((s) =>
                s.id === subId
                  ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)) }
                  : s
              ),
            }
          : e
      );
      const events: HistoryEvent[] = [];
      if (data.status && item && data.status !== item.status) {
        events.push(makeEvent("status_changed", `"${item.name}" → ${data.status}`));
      } else if (item) {
        events.push(makeEvent("item_updated", `"${item.name}" updated`));
      }
      let result = updated;
      for (const ev of events) {
        result = addHistoryToEnvelope(result, envelopeId, ev);
      }
      persist(result);
    },
    [envelopes, persist]
  );

  const deleteItem = useCallback(
    (envelopeId: string, subId: string, itemId: string) => {
      const envelope = envelopes.find((e) => e.id === envelopeId);
      const sub = envelope?.subcategories.find((s) => s.id === subId);
      const item = sub?.items.find((i) => i.id === itemId);
      const updated = envelopes.map((e) =>
        e.id === envelopeId
          ? {
              ...e,
              subcategories: e.subcategories.map((s) =>
                s.id === subId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
              ),
            }
          : e
      );
      const withHistory = addHistoryToEnvelope(updated, envelopeId, makeEvent("item_deleted", `Item "${item?.name ?? "?"}" deleted`));
      persist(withHistory);
    },
    [envelopes, persist]
  );

  const restoreItem = useCallback(
    (envelopeId: string, subId: string, item: ExpenseItem) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? {
                ...e,
                subcategories: e.subcategories.map((s) =>
                  s.id === subId ? { ...s, items: [...s.items, item] } : s
                ),
              }
            : e
        )
      );
    },
    [envelopes, persist]
  );

  const bulkUpdateStatus = useCallback(
    (envelopeId: string, subId: string, itemIds: string[], status: ItemStatus) => {
      const updated = envelopes.map((e) =>
        e.id === envelopeId
          ? {
              ...e,
              subcategories: e.subcategories.map((s) =>
                s.id === subId
                  ? { ...s, items: s.items.map((i) => (itemIds.includes(i.id) ? { ...i, status } : i)) }
                  : s
              ),
            }
          : e
      );
      const withHistory = addHistoryToEnvelope(updated, envelopeId, makeEvent("bulk_status", `${itemIds.length} item${itemIds.length !== 1 ? "s" : ""} set to ${status}`));
      persist(withHistory);
    },
    [envelopes, persist]
  );

  return (
    <FundoContext.Provider
      value={{
        envelopes,
        addEnvelope,
        updateEnvelope,
        deleteEnvelope,
        restoreEnvelope,
        archiveEnvelope,
        duplicateEnvelope,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        restoreSubcategory,
        addItem,
        updateItem,
        deleteItem,
        restoreItem,
        bulkUpdateStatus,
      }}
    >
      {children}
    </FundoContext.Provider>
  );
}

export function useFundo() {
  const ctx = useContext(FundoContext);
  if (!ctx) throw new Error("useFundo must be used inside FundoProvider");
  return ctx;
}
