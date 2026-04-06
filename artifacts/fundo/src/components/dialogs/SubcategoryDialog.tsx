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
import { Subcategory, useFundo } from "@/context/FundoContext";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  allocatedBudget: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

interface SubcategoryDialogProps {
  open: boolean;
  onClose: () => void;
  envelopeId: string;
  subcategory?: Subcategory;
}

export function SubcategoryDialog({ open, onClose, envelopeId, subcategory }: SubcategoryDialogProps) {
  const { addSubcategory, updateSubcategory } = useFundo();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: subcategory?.name ?? "",
      allocatedBudget: subcategory?.allocatedBudget ?? undefined,
    },
  });

  function onSubmit(values: FormValues) {
    if (subcategory) {
      updateSubcategory(envelopeId, subcategory.id, {
        name: values.name,
        allocatedBudget: values.allocatedBudget || undefined,
      });
    } else {
      addSubcategory(envelopeId, {
        name: values.name,
        allocatedBudget: values.allocatedBudget || undefined,
      });
    }
    form.reset();
    onClose();
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subcategory ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Keychains, Water Bill" {...field} data-testid="input-subcategory-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allocatedBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Budget ₱ (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                      data-testid="input-subcategory-budget"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-subcategory">
                {subcategory ? "Save Changes" : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
