import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseItem, ItemStatus, useFundo } from "@/context/FundoContext";

const statuses: ItemStatus[] = ["Unordered", "Ordered", "Received", "Paid"];

const schema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  estimatedUnitPrice: z.coerce.number().min(0, "Estimated price must be positive"),
  actualUnitPrice: z.coerce.number().min(0).optional(),
  status: z.enum(["Unordered", "Ordered", "Received", "Paid"]),
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

export function ExpenseItemDialog({ open, onClose, envelopeId, subcategoryId, item }: ExpenseItemDialogProps) {
  const { addItem, updateItem } = useFundo();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      quantity: item?.quantity ?? 1,
      estimatedUnitPrice: item?.estimatedUnitPrice ?? 0,
      actualUnitPrice: item?.actualUnitPrice ?? undefined,
      status: item?.status ?? "Unordered",
      receiptRef: item?.receiptRef ?? "",
      notes: item?.notes ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    const data = {
      name: values.name,
      quantity: values.quantity,
      estimatedUnitPrice: values.estimatedUnitPrice,
      actualUnitPrice: values.actualUnitPrice || undefined,
      status: values.status,
      receiptRef: values.receiptRef || undefined,
      notes: values.notes || undefined,
    };
    if (item) {
      updateItem(envelopeId, subcategoryId, item.id, data);
    } else {
      addItem(envelopeId, subcategoryId, data);
    }
    form.reset();
    onClose();
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  const qty = form.watch("quantity") || 0;
  const est = form.watch("estimatedUnitPrice") || 0;
  const act = form.watch("actualUnitPrice");
  const estTotal = qty * est;
  const actTotal = act ? qty * act : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Keychain, Venue deposit" {...field} data-testid="input-item-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" step="1" {...field} data-testid="input-item-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimatedUnitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Price ₱</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-item-estimated" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actualUnitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Price ₱</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                        data-testid="input-item-actual"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 text-sm bg-muted rounded-lg px-3 py-2">
              <div>
                <span className="text-muted-foreground">Est. Total: </span>
                <span className="font-medium">₱{estTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
              {actTotal !== null && (
                <div>
                  <span className="text-muted-foreground">Actual Total: </span>
                  <span className="font-medium text-primary">₱{actTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-item-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / Reference (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. OR-001, Invoice #1234" {...field} data-testid="input-item-receipt" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Supplier, remarks..." {...field} rows={2} data-testid="input-item-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-item">
                {item ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
