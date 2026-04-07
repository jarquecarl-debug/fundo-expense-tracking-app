import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseItem, ItemStatus, Payment, useFundo } from "@/context/FundoContext";
import { formatPeso } from "@/lib/format";
import { Plus, Trash2, Flag } from "lucide-react";

const statuses: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];
type Priority = "low" | "medium" | "high";

const schema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  estimatedUnitPrice: z.coerce.number().min(0, "Estimated price must be positive"),
  actualUnitPrice: z.coerce.number().min(0).optional(),
  status: z.enum(["Unordered", "Ordered", "Received", "Paid"]),
  priority: z.enum(["low", "medium", "high"]).optional(),
  vendor: z.string().optional(),
  dueDate: z.string().optional(),
  receiptRef: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseItemDialogProps {
  open: boolean;
  onClose: () => void;
  envelopeId: string;
  subcategoryId: string;
  item?: ExpenseItem;
}

const priorityColors: Record<Priority, string> = {
  low: "text-blue-500",
  medium: "text-amber-500",
  high: "text-red-500",
};

export function ExpenseItemDialog({ open, onClose, envelopeId, subcategoryId, item }: ExpenseItemDialogProps) {
  const { addItem, updateItem } = useFundo();
  const [payments, setPayments] = useState<Payment[]>(item?.payments ?? []);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      quantity: item?.quantity ?? 1,
      estimatedUnitPrice: item?.estimatedUnitPrice ?? 0,
      actualUnitPrice: item?.actualUnitPrice ?? undefined,
      status: item?.status ?? "Unordered",
      priority: item?.priority ?? undefined,
      vendor: item?.vendor ?? "",
      dueDate: item?.dueDate ?? "",
      receiptRef: item?.receiptRef ?? "",
      notes: item?.notes ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    const data: Omit<ExpenseItem, "id"> = {
      name: values.name,
      quantity: values.quantity,
      estimatedUnitPrice: values.estimatedUnitPrice,
      actualUnitPrice: values.actualUnitPrice || undefined,
      status: values.status,
      priority: values.priority,
      vendor: values.vendor || undefined,
      dueDate: values.dueDate || undefined,
      receiptRef: values.receiptRef || undefined,
      notes: values.notes || undefined,
      payments,
    };
    if (item) {
      updateItem(envelopeId, subcategoryId, item.id, data);
    } else {
      addItem(envelopeId, subcategoryId, data);
    }
    form.reset();
    setPayments([]);
    onClose();
  }

  function handleClose() {
    form.reset();
    setPayments(item?.payments ?? []);
    onClose();
  }

  function addPayment() {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    setPayments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), amount, date: payDate, note: payNote || undefined },
    ]);
    setPayAmount("");
    setPayNote("");
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  const qty = form.watch("quantity") || 0;
  const est = form.watch("estimatedUnitPrice") || 0;
  const act = form.watch("actualUnitPrice");
  const estTotal = qty * est;
  const actTotal = act ? qty * act : null;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Item Name</FormLabel>
                <FormControl><Input placeholder="e.g. Keychain, Venue deposit" {...field} data-testid="input-item-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl><Input type="number" min="1" step="1" {...field} data-testid="input-item-quantity" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="estimatedUnitPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Est. Price ₱</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-item-estimated" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="actualUnitPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Price ₱</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min="0" step="0.01" placeholder="0.00" {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                      data-testid="input-item-actual"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-4 text-sm bg-muted rounded-lg px-3 py-2">
              <div><span className="text-muted-foreground">Est. Total: </span><span className="font-medium">₱{estTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
              {actTotal !== null && <div><span className="text-muted-foreground">Actual Total: </span><span className="font-medium text-primary">₱{actTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="vendor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor / Supplier</FormLabel>
                  <FormControl><Input placeholder="e.g. Lazada, SM Store" {...field} data-testid="input-item-vendor" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due / Order By Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-item-due-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-item-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-item-priority">
                        <SelectValue placeholder="None">
                          {field.value && (
                            <span className="flex items-center gap-1.5">
                              <Flag className={`w-3 h-3 ${priorityColors[field.value as Priority]}`} />
                              {field.value.charAt(0).toUpperCase() + field.value.slice(1)}
                            </span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="low"><span className="flex items-center gap-1.5"><Flag className="w-3 h-3 text-blue-500" /> Low</span></SelectItem>
                      <SelectItem value="medium"><span className="flex items-center gap-1.5"><Flag className="w-3 h-3 text-amber-500" /> Medium</span></SelectItem>
                      <SelectItem value="high"><span className="flex items-center gap-1.5"><Flag className="w-3 h-3 text-red-500" /> High</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="receiptRef" render={({ field }) => (
              <FormItem>
                <FormLabel>Receipt / Reference (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. OR-001, Invoice #1234" {...field} data-testid="input-item-receipt" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Remarks, contact..." {...field} rows={2} data-testid="input-item-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">Partial Payments</label>
                {totalPaid > 0 && <span className="text-xs text-green-600 dark:text-green-400 font-medium">{formatPeso(totalPaid)} paid so far</span>}
              </div>
              {payments.length > 0 && (
                <div className="border border-border rounded-lg divide-y divide-border text-sm">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 font-medium text-green-600 dark:text-green-400">{formatPeso(p.amount)}</span>
                      <span className="text-muted-foreground text-xs">{p.date}</span>
                      {p.note && <span className="text-muted-foreground text-xs truncate max-w-24">{p.note}</span>}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" type="button" onClick={() => removePayment(p.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Amount ₱</div>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date</div>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Note</div>
                  <Input placeholder="optional" value={payNote} onChange={(e) => setPayNote(e.target.value)} className="h-8 text-sm" />
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={addPayment} disabled={!payAmount}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" data-testid="button-save-item">{item ? "Save Changes" : "Add Item"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
