import { useState } from "react";
import { Printer, Minus, Plus, CheckCircle2 } from "lucide-react";
import Button from "./ui/Button";
import { buildPrintJob } from "../utils/escpos";

export default function PrintControls({ printer, bitmap, disabled }) {
  const [copies, setCopies] = useState(1);
  const [justPrinted, setJustPrinted] = useState(false);

  const handlePrint = async () => {
    if (!bitmap) return;
    setJustPrinted(false);
    const job = buildPrintJob(bitmap, { feedAfter: 4, cut: true, copies });
    await printer.print(job);
    setJustPrinted(true);
    setTimeout(() => setJustPrinted(false), 2500);
  };

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-semibold text-ink-900">Cetak</h2>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-700">Jumlah rangkap</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCopies((c) => Math.max(1, c - 1))}
            className="rounded-md border border-ink-900/10 p-1.5 text-ink-700 hover:bg-paper-100"
          >
            <Minus size={14} />
          </button>
          <span className="w-4 text-center font-mono text-sm">{copies}</span>
          <button
            onClick={() => setCopies((c) => Math.min(9, c + 1))}
            className="rounded-md border border-ink-900/10 p-1.5 text-ink-700 hover:bg-paper-100"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <Button
        icon={justPrinted ? CheckCircle2 : Printer}
        onClick={handlePrint}
        loading={printer.isPrinting}
        disabled={disabled || !bitmap}
        className="mt-4 w-full"
      >
        {justPrinted ? "Terkirim ke Printer" : "Print"}
      </Button>

      {disabled && (
        <p className="mt-2 text-center text-xs text-ink-500">
          Hubungkan printer dan unggah resi terlebih dahulu.
        </p>
      )}
    </div>
  );
}
