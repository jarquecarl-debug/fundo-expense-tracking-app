import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useFundo } from "@/context/FundoContext";
import { exportBackup, importBackup, parseCsvItems, buildImportedItems, CsvRow } from "@/lib/backup";
import { toast } from "sonner";

interface BackupDialogProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "backup" | "import";

export function BackupDialog({ open, onClose }: BackupDialogProps) {
  const { envelopes, replaceAllEnvelopes, addItem } = useFundo();
  const [tab, setTab] = useState<Tab>("backup");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvPasted, setCsvPasted] = useState("");
  const [targetEnvelopeId, setTargetEnvelopeId] = useState("");
  const [targetSubId, setTargetSubId] = useState("");
  const [importing, setImporting] = useState(false);

  const activeEnvelopes = envelopes.filter((e) => !e.archived);
  const targetEnvelope = activeEnvelopes.find((e) => e.id === targetEnvelopeId);

  function handleExport() {
    exportBackup();
    toast.success("Backup downloaded");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importBackup(file);
      replaceAllEnvelopes(data);
      toast.success(`Restored ${data.length} envelopes from backup`);
      onClose();
    } catch {
      toast.error("Failed to restore backup — invalid file");
    }
    e.target.value = "";
  }

  function parseCsv(text: string) {
    setCsvError("");
    setCsvRows([]);
    if (!text.trim()) return;
    try {
      const rows = parseCsvItems(text);
      if (rows.length === 0) throw new Error("No valid rows found");
      setCsvRows(rows);
    } catch (err) {
      setCsvError((err as Error).message);
    }
  }

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvPasted(text);
    parseCsv(text);
    e.target.value = "";
  }

  function handleCsvPaste(text: string) {
    setCsvPasted(text);
    parseCsv(text);
  }

  async function handleImportCsv() {
    if (!targetEnvelopeId || !targetSubId || csvRows.length === 0) return;
    setImporting(true);
    const items = buildImportedItems(csvRows);
    for (const item of items) {
      addItem(targetEnvelopeId, targetSubId, item);
    }
    toast.success(`Imported ${items.length} item${items.length !== 1 ? "s" : ""}`);
    setCsvRows([]);
    setCsvPasted("");
    setImporting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Data Management</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          {(["backup", "import"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "backup" ? "Backup & Restore" : "CSV Import"}
            </button>
          ))}
        </div>

        {tab === "backup" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 space-y-2">
              <h4 className="font-medium text-sm">Export Backup</h4>
              <p className="text-muted-foreground text-xs">Download all your envelopes as a JSON file. Use this to back up or transfer your data.</p>
              <Button onClick={handleExport} variant="outline" className="w-full" data-testid="button-export-backup">
                <Download className="w-4 h-4 mr-2" /> Download Backup
              </Button>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-2">
              <h4 className="font-medium text-sm">Restore Backup</h4>
              <p className="text-muted-foreground text-xs">Upload a previously downloaded backup file. This will replace all current data.</p>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950" data-testid="button-import-backup">
                <Upload className="w-4 h-4 mr-2" /> Restore from File
              </Button>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> This will overwrite all existing data.
              </p>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h4 className="font-medium text-sm">Upload or Paste CSV</h4>
              <p className="text-xs text-muted-foreground">
                CSV should have columns: <span className="font-mono bg-muted px-1 rounded">name</span>, <span className="font-mono bg-muted px-1 rounded">quantity</span>, <span className="font-mono bg-muted px-1 rounded">estimatedUnitPrice</span> (also accepts variations like "price", "qty").
              </p>
              <input ref={csvInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvFile} />
              <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} className="w-full">
                <FileUp className="w-4 h-4 mr-2" /> Upload CSV File
              </Button>
              <Textarea
                placeholder="Or paste CSV text here&#10;name,quantity,estimatedUnitPrice&#10;Venue deposit,1,5000&#10;Catering,20,350"
                value={csvPasted}
                onChange={(e) => handleCsvPaste(e.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
            </div>

            {csvError && (
              <div className="flex items-start gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {csvError}
              </div>
            )}

            {csvRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} parsed
                </div>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg text-xs">
                  {csvRows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0 border-border">
                      <span className="flex-1 font-medium">{r.name}</span>
                      <span className="text-muted-foreground">×{r.quantity}</span>
                      <span className="text-muted-foreground">₱{r.estimatedUnitPrice}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Select value={targetEnvelopeId} onValueChange={(v) => { setTargetEnvelopeId(v); setTargetSubId(""); }}>
                    <SelectTrigger data-testid="select-import-envelope">
                      <SelectValue placeholder="Select envelope..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEnvelopes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {targetEnvelope && (
                    <Select value={targetSubId} onValueChange={setTargetSubId}>
                      <SelectTrigger data-testid="select-import-subcategory">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {targetEnvelope.subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    className="w-full"
                    disabled={!targetEnvelopeId || !targetSubId || importing}
                    onClick={handleImportCsv}
                    data-testid="button-import-csv"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Import {csvRows.length} Item{csvRows.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
