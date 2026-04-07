import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFundo } from "@/context/FundoContext";
import { toast } from "sonner";

export function QuickAddDialog() {
  const { envelopes, addItem } = useFundo();
  const [open, setOpen] = useState(false);
  const [envelopeId, setEnvelopeId] = useState("");
  const [subId, setSubId] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const activeEnvelopes = envelopes.filter((e) => !e.archived);
  const selectedEnvelope = activeEnvelopes.find((e) => e.id === envelopeId);
  const subcategories = selectedEnvelope?.subcategories ?? [];

  function handleOpen() {
    setEnvelopeId(activeEnvelopes.length === 1 ? activeEnvelopes[0].id : "");
    setSubId("");
    setName("");
    setQty("1");
    setPrice("");
    setOpen(true);
  }

  function handleEnvelopeChange(id: string) {
    setEnvelopeId(id);
    setSubId("");
  }

  function handleSubmit() {
    if (!envelopeId || !subId || !name.trim()) return;
    addItem(envelopeId, subId, {
      name: name.trim(),
      quantity: Math.max(1, parseInt(qty) || 1),
      estimatedUnitPrice: parseFloat(price) || 0,
      status: "Unordered",
      payments: [],
    });
    const env = activeEnvelopes.find((e) => e.id === envelopeId);
    const sub = env?.subcategories.find((s) => s.id === subId);
    toast.success(`Added "${name.trim()}" to ${env?.name} › ${sub?.name}`);
    setOpen(false);
  }

  const canSubmit = !!envelopeId && !!subId && !!name.trim();

  if (activeEnvelopes.length === 0) return null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all rounded-full px-4 py-3 font-medium text-sm print:hidden"
        data-testid="button-quick-add-fab"
        title="Quick add item"
      >
        <Zap className="w-4 h-4" />
        Quick Add
      </button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Quick Add Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Envelope</label>
              <Select value={envelopeId} onValueChange={handleEnvelopeChange}>
                <SelectTrigger data-testid="quick-select-envelope">
                  <SelectValue placeholder="Pick an envelope..." />
                </SelectTrigger>
                <SelectContent>
                  {activeEnvelopes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEnvelope && (
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Category</label>
                <Select value={subId} onValueChange={setSubId}>
                  <SelectTrigger data-testid="quick-select-subcategory">
                    <SelectValue placeholder="Pick a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {subcategories.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No categories yet — add one first</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Item Name</label>
              <Input
                placeholder="e.g. Venue deposit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                autoFocus
                data-testid="quick-input-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Quantity</label>
                <Input
                  type="number" min="1" value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  data-testid="quick-input-qty"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Est. Price ₱</label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={price} onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
                  data-testid="quick-input-price"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} data-testid="quick-button-add">
              <Plus className="w-4 h-4 mr-1.5" /> Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
