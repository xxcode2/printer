import { useState } from "react";
import { Printer, Minus, Plus, CheckCircle2, Layers } from "lucide-react";
import Button from "./ui/Button";
import { buildPrintJob } from "../utils/escpos";
import { convertAllPdfPages } from "../utils/multiPageConvert";
import { parsePageRange } from "../utils/pageRange";

export default function PrintControls({ printer, bitmap, file, settings, disabled }) {
  const [copies, setCopies] = useState(1);
  const [justPrinted, setJustPrinted] = useState(false);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [allPagesProgress, setAllPagesProgress] = useState(null);

  const isPdf = file?.type === "application/pdf";

  // Hitung halaman yang dipilih dari pageRange
  const selectedPages = isPdf
    ? parsePageRange(settings.pageRange || "", settings.pageCount || 1)
    : [];
  const totalPages = isPdf ? (settings.pageCount || 1) : 0;
  const hasCustomRange = selectedPages.length > 0 && selectedPages.length < totalPages;

  const handlePrint = async () => {
    if (!bitmap) return;
    setJustPrinted(false);
    const job = buildPrintJob(bitmap, { feedAfter: 4, cut: true, copies });
    await printer.print(job);
    setJustPrinted(true);
    setTimeout(() => setJustPrinted(false), 2500);
  };

  const handlePrintAllPages = async () => {
    if (!file || !isPdf) return;
    setIsPrintingAll(true);
    setAllPagesProgress(null);
    setJustPrinted(false);

    try {
      // Kalau ada range custom, hanya cetak halaman yang dipilih
      const pagesToConvert = hasCustomRange ? selectedPages : undefined;
      const { bitmaps } = await convertAllPdfPages(
        file,
        {
          paperWidthDots: settings.paperWidthDots,
          threshold: settings.threshold,
          dither: settings.dither,
          showLogo: settings.showLogo,
        },
        (current, total) => setAllPagesProgress({ current, total }),
        pagesToConvert
      );

      // Kirim setiap halaman sebagai job terpisah, halaman terakhir yang di-cut
      for (let i = 0; i < bitmaps.length; i++) {
        const isLast = i === bitmaps.length - 1;
        const job = buildPrintJob(bitmaps[i], {
          feedAfter: 4,
          cut: isLast,
          copies,
        });
        await printer.print(job);
      }

      setJustPrinted(true);
      setTimeout(() => setJustPrinted(false), 2500);
    } catch (err) {
      console.error("Print all pages error:", err);
    } finally {
      setIsPrintingAll(false);
      setAllPagesProgress(null);
    }
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

      {isPdf && (
        <Button
          icon={justPrinted ? CheckCircle2 : Layers}
          variant="secondary"
          onClick={handlePrintAllPages}
          loading={isPrintingAll}
          disabled={disabled || !file || selectedPages.length === 0}
          className="mt-2 w-full"
        >
          {isPrintingAll && allPagesProgress
            ? `Memproses ${allPagesProgress.current}/${allPagesProgress.total}…`
            : justPrinted
            ? "Halaman Terkirim"
            : hasCustomRange
            ? `Cetak ${selectedPages.length} Halaman`
            : "Cetak Semua Halaman"}
        </Button>
      )}

      {disabled && (
        <p className="mt-2 text-center text-xs text-ink-500">
          Hubungkan printer dan unggah resi terlebih dahulu.
        </p>
      )}
    </div>
  );
}
