import { useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { parsePageRange, compressToRange } from "../utils/pageRange";

const PAPER_WIDTHS = [
  { label: "58 mm", dots: 384 },
  { label: "72 mm", dots: 576 },
  { label: "80 mm", dots: 640 },
];

export default function ReceiptPreview({ file, settings, onSettingsChange, converter }) {
  const { status, error, previewUrl, pageCount, thumbnails } = converter;
  const isPdf = file?.type === "application/pdf";
  const [rangeInput, setRangeInput] = useState(settings.pageRange || "");

  const selectedPages = isPdf ? parsePageRange(settings.pageRange || `${1}-${pageCount}`, pageCount) : [];
  const allSelected = selectedPages.length === pageCount;

  // Toggle halaman di page range
  const togglePage = (pageNum) => {
    const current = parsePageRange(settings.pageRange || `1-${pageCount}`, pageCount);
    const idx = current.indexOf(pageNum);
    const next = idx >= 0
      ? current.filter((p) => p !== pageNum)
      : [...current, pageNum].sort((a, b) => a - b);

    // Kompres jadi string range
    const rangeStr = compressToRange(next);
    setRangeInput(rangeStr);
    onSettingsChange({ pageRange: rangeStr, pageNumber: pageNum });
  };

  // Handle input page range manual
  const handleRangeSubmit = (value) => {
    setRangeInput(value);
    const parsed = parsePageRange(value, pageCount);
    if (parsed.length > 0) {
      onSettingsChange({ pageRange: value, pageNumber: parsed[0] });
    }
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (allSelected) {
      const rangeStr = `${settings.pageNumber}`;
      setRangeInput(rangeStr);
      onSettingsChange({ pageRange: rangeStr });
    } else {
      const rangeStr = `1-${pageCount}`;
      setRangeInput(rangeStr);
      onSettingsChange({ pageRange: rangeStr });
    }
  };

  if (!file) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-ink-900/15 bg-white/50 p-8 text-center">
        <p className="text-sm text-ink-500">Preview resi akan muncul di sini setelah Anda mengunggah file.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink-900">Preview Hasil Cetak</h2>
        <div className="flex items-center gap-2">
          {status === "loading" && <span className="text-xs text-ink-500">Memproses…</span>}
          {isPdf && status === "ready" && (
            <span className="rounded-full bg-ink-900/5 px-2.5 py-0.5 font-mono text-xs text-ink-600">
              {pageCount} halaman
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-signal/5 px-3 py-2 text-xs text-signal">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigasi halaman untuk PDF multi-page */}
      {isPdf && pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => onSettingsChange({ pageNumber: Math.max(1, settings.pageNumber - 1) })}
            disabled={settings.pageNumber <= 1}
            className="rounded-lg border border-ink-900/10 p-1.5 text-ink-700 transition-colors hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[80px] text-center font-mono text-sm text-ink-700">
            Halaman {settings.pageNumber} / {pageCount}
          </span>
          <button
            onClick={() => onSettingsChange({ pageNumber: Math.min(pageCount, settings.pageNumber + 1) })}
            disabled={settings.pageNumber >= pageCount}
            className="rounded-lg border border-ink-900/10 p-1.5 text-ink-700 transition-colors hover:bg-paper-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4 md:flex-row">
        {/* Kanvas preview meniru tampilan kertas thermal */}
        <div className="flex flex-1 justify-center rounded-lg bg-ink-900/5 p-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview resi hasil konversi monokrom"
              className="max-h-[420px] w-auto border border-ink-900/10 bg-white shadow-sm"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-xs text-ink-400">
              Belum ada preview
            </div>
          )}
        </div>

        {/* Panel pengaturan konversi */}
        <div className="w-full shrink-0 space-y-4 md:w-56">
          <div>
            <label className="text-xs font-medium text-ink-700">Lebar Kertas</label>
            <div className="mt-1.5 flex gap-2">
              {PAPER_WIDTHS.map((w) => (
                <button
                  key={w.dots}
                  onClick={() => onSettingsChange({ paperWidthDots: w.dots })}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    settings.paperWidthDots === w.dots
                      ? "border-signal bg-signal/5 text-signal"
                      : "border-ink-900/10 text-ink-700 hover:bg-paper-100"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-700">Ketajaman (Threshold)</label>
              <span className="font-mono text-xs text-ink-500">{settings.threshold}</span>
            </div>
            <input
              type="range"
              min={80}
              max={220}
              value={settings.threshold}
              onChange={(e) => onSettingsChange({ threshold: Number(e.target.value) })}
              className="mt-1.5 w-full accent-signal"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input
              type="checkbox"
              checked={settings.dither}
              onChange={(e) => onSettingsChange({ dither: e.target.checked })}
              className="accent-signal"
            />
            Dithering (lebih baik untuk foto/logo)
          </label>
        </div>
      </div>

      {/* Thumbnail strip + page range selector */}
      {isPdf && thumbnails.length > 1 && (
        <div className="mt-4 border-t border-ink-900/10 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-700">Pilih Halaman</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-500">
                {selectedPages.length}/{pageCount} dipilih
              </span>
              <button
                onClick={toggleSelectAll}
                className="rounded px-2 py-0.5 text-[10px] font-medium text-signal hover:bg-signal/5"
              >
                {allSelected ? "Batal Semua" : "Pilih Semua"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {thumbnails.map((url, i) => {
              const pageNum = i + 1;
              const isSelected = selectedPages.includes(pageNum);
              const isCurrent = settings.pageNumber === pageNum;
              return (
                <button
                  key={i}
                  onClick={() => togglePage(pageNum)}
                  className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    isCurrent
                      ? "border-signal ring-2 ring-signal/20"
                      : isSelected
                      ? "border-wire ring-1 ring-wire/20"
                      : "border-ink-900/10 opacity-50 hover:border-ink-900/25 hover:opacity-75"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Halaman ${pageNum}`}
                    className="h-20 w-auto"
                  />
                  {/* Badge nomor halaman */}
                  <span className={`absolute bottom-0.5 right-0.5 rounded px-1 py-0.5 font-mono text-[10px] leading-none ${
                    isCurrent
                      ? "bg-signal text-white"
                      : isSelected
                      ? "bg-wire text-white"
                      : "bg-ink-900/60 text-white"
                  }`}>
                    {pageNum}
                  </span>
                  {/* Checkmark kalau terpilih */}
                  {isSelected && !isCurrent && (
                    <div className="absolute left-0.5 top-0.5 rounded-full bg-wire p-0.5">
                      <Check size={8} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Input page range custom */}
          <div className="mt-3">
            <label className="text-xs font-medium text-ink-700">Range Halaman</label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              onBlur={() => handleRangeSubmit(rangeInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur();
                  handleRangeSubmit(rangeInput);
                }
              }}
              placeholder={`cth: 1-3, 5, 7-${pageCount}`}
              className="mt-1 w-full rounded-lg border border-ink-900/10 px-3 py-1.5 font-mono text-sm text-ink-900 placeholder:text-ink-300 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal/20"
            />
            <p className="mt-1 text-[10px] text-ink-400">
              Pisahkan dengan koma atau pakai tanda hubung. Cth: "2-10" atau "1,3,5-8"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
