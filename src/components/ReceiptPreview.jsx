import { AlertCircle } from "lucide-react";

const PAPER_WIDTHS = [
  { label: "58 mm", dots: 384 },
  { label: "80 mm", dots: 576 },
];

export default function ReceiptPreview({ file, settings, onSettingsChange, converter }) {
  const { status, error, previewUrl, pageCount } = converter;

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
        {status === "loading" && <span className="text-xs text-ink-500">Memproses…</span>}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-signal/5 px-3 py-2 text-xs text-signal">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
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

          {pageCount > 1 && (
            <div>
              <label className="text-xs font-medium text-ink-700">Halaman</label>
              <select
                value={settings.pageNumber}
                onChange={(e) => onSettingsChange({ pageNumber: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-ink-900/10 px-3 py-1.5 text-sm"
              >
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Halaman {n}
                  </option>
                ))}
              </select>
            </div>
          )}

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
    </div>
  );
}
