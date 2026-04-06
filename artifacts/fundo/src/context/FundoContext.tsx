import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ItemStatus = "Unordered" | "Ordered" | "Received" | "Paid";

export interface ExpenseItem {
  id: string;
  name: string;
  quantity: number;
  estimatedUnitPrice: number;
  actualUnitPrice?: number;
  notes?: string;
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
}

interface FundoContextValue {
  envelopes: Envelope[];
  addEnvelope: (data: Omit<Envelope, "id" | "subcategories" | "createdAt">) => Envelope;
  updateEnvelope: (id: string, data: Partial<Omit<Envelope, "id" | "subcategories" | "createdAt">>) => void;
  deleteEnvelope: (id: string) => void;
  addSubcategory: (envelopeId: string, data: Omit<Subcategory, "id" | "items">) => Subcategory;
  updateSubcategory: (envelopeId: string, subId: string, data: Partial<Omit<Subcategory, "id" | "items">>) => void;
  deleteSubcategory: (envelopeId: string, subId: string) => void;
  addItem: (envelopeId: string, subId: string, data: Omit<ExpenseItem, "id">) => ExpenseItem;
  updateItem: (envelopeId: string, subId: string, itemId: string, data: Partial<Omit<ExpenseItem, "id">>) => void;
  deleteItem: (envelopeId: string, subId: string, itemId: string) => void;
}

const STORAGE_KEY = "fundo_envelopes";

function loadEnvelopes(): Envelope[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Envelope[];
  } catch {
    return [];
  }
}

function saveEnvelopes(envelopes: Envelope[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelopes));
}

const FundoContext = createContext<FundoContextValue | null>(null);

export function FundoProvider({ children }: { children: ReactNode }) {
  const [envelopes, setEnvelopes] = useState<Envelope[]>(() => loadEnvelopes());

  const persist = useCallback((next: Envelope[]) => {
    setEnvelopes(next);
    saveEnvelopes(next);
  }, []);

  const addEnvelope = useCallback(
    (data: Omit<Envelope, "id" | "subcategories" | "createdAt">) => {
      const envelope: Envelope = {
        ...data,
        id: crypto.randomUUID(),
        subcategories: [],
        createdAt: new Date().toISOString(),
      };
      persist([...envelopes, envelope]);
      return envelope;
    },
    [envelopes, persist]
  );

  const updateEnvelope = useCallback(
    (id: string, data: Partial<Omit<Envelope, "id" | "subcategories" | "createdAt">>) => {
      persist(envelopes.map((e) => (e.id === id ? { ...e, ...data } : e)));
    },
    [envelopes, persist]
  );

  const deleteEnvelope = useCallback(
    (id: string) => {
      persist(envelopes.filter((e) => e.id !== id));
    },
    [envelopes, persist]
  );

  const addSubcategory = useCallback(
    (envelopeId: string, data: Omit<Subcategory, "id" | "items">) => {
      const sub: Subcategory = { ...data, id: crypto.randomUUID(), items: [] };
      persist(
        envelopes.map((e) =>
          e.id === envelopeId ? { ...e, subcategories: [...e.subcategories, sub] } : e
        )
      );
      return sub;
    },
    [envelopes, persist]
  );

  const updateSubcategory = useCallback(
    (envelopeId: string, subId: string, data: Partial<Omit<Subcategory, "id" | "items">>) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? {
                ...e,
                subcategories: e.subcategories.map((s) =>
                  s.id === subId ? { ...s, ...data } : s
                ),
              }
            : e
        )
      );
    },
    [envelopes, persist]
  );

  const deleteSubcategory = useCallback(
    (envelopeId: string, subId: string) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? { ...e, subcategories: e.subcategories.filter((s) => s.id !== subId) }
            : e
        )
      );
    },
    [envelopes, persist]
  );

  const addItem = useCallback(
    (envelopeId: string, subId: string, data: Omit<ExpenseItem, "id">) => {
      const item: ExpenseItem = { ...data, id: crypto.randomUUID() };
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
      return item;
    },
    [envelopes, persist]
  );

  const updateItem = useCallback(
    (envelopeId: string, subId: string, itemId: string, data: Partial<Omit<ExpenseItem, "id">>) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? {
                ...e,
                subcategories: e.subcategories.map((s) =>
                  s.id === subId
                    ? {
                        ...s,
                        items: s.items.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
                      }
                    : s
                ),
              }
            : e
        )
      );
    },
    [envelopes, persist]
  );

  const deleteItem = useCallback(
    (envelopeId: string, subId: string, itemId: string) => {
      persist(
        envelopes.map((e) =>
          e.id === envelopeId
            ? {
                ...e,
                subcategories: e.subcategories.map((s) =>
                  s.id === subId
                    ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
                    : s
                ),
              }
            : e
        )
      );
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
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        addItem,
        updateItem,
        deleteItem,
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
