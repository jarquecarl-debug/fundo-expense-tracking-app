import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { EnvelopeDialog } from "@/components/dialogs/EnvelopeDialog";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { envelopes, deleteEnvelope } = useFundo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const editingEnvelope = editId ? envelopes.find((e) => e.id === editId) : undefined;

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete envelope "${name}"? This cannot be undone.`)) {
      deleteEnvelope(id);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Fundo</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {envelopes.length === 0
                ? "Start by creating your first budget envelope"
                : `${envelopes.length} ${envelopes.length === 1 ? "envelope" : "envelopes"}`}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-envelope">
            <Plus className="w-4 h-4 mr-2" /> New Envelope
          </Button>
        </div>

        {envelopes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No envelopes yet</h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              Create an envelope to start tracking your budget — for events, household bills, or anything else.
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-envelope">
              <Plus className="w-4 h-4 mr-2" /> Create First Envelope
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {envelopes.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                onEdit={() => setEditId(envelope.id)}
                onDelete={() => handleDelete(envelope.id, envelope.name)}
              />
            ))}
          </div>
        )}
      </div>

      <EnvelopeDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {editingEnvelope && (
        <EnvelopeDialog
          open={!!editId}
          onClose={() => setEditId(null)}
          envelope={editingEnvelope}
        />
      )}
    </div>
  );
}
