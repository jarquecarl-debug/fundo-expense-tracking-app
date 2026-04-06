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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Envelope, useFundo } from "@/context/FundoContext";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  totalBudget: z.coerce.number().min(0, "Budget must be positive"),
  eventDate: z.string().optional(),
  tagsRaw: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  envelope?: Envelope;
}

export function EnvelopeDialog({ open, onClose, envelope }: EnvelopeDialogProps) {
  const { addEnvelope, updateEnvelope } = useFundo();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: envelope?.name ?? "",
      totalBudget: envelope?.totalBudget ?? 0,
      eventDate: envelope?.eventDate ?? "",
      tagsRaw: envelope?.tags?.join(", ") ?? "",
    },
  });

  function parseTags(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  function onSubmit(values: FormValues) {
    const tags = parseTags(values.tagsRaw);
    if (envelope) {
      updateEnvelope(envelope.id, {
        name: values.name,
        totalBudget: values.totalBudget,
        eventDate: values.eventDate || undefined,
        tags,
      });
    } else {
      addEnvelope({
        name: values.name,
        totalBudget: values.totalBudget,
        eventDate: values.eventDate || undefined,
        tags,
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
          <DialogTitle>{envelope ? "Edit Envelope" : "New Envelope"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Envelope Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. July 30 Event" {...field} data-testid="input-envelope-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Budget (₱)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} data-testid="input-envelope-budget" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-envelope-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagsRaw"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. personal, events, household" {...field} data-testid="input-envelope-tags" />
                  </FormControl>
                  <FormDescription>Separate tags with commas</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-envelope">
                {envelope ? "Save Changes" : "Create Envelope"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
