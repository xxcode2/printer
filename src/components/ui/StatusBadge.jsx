import clsx from "clsx";

const CONFIG = {
  connected: { label: "Terhubung", dot: "bg-wire", text: "text-wire" },
  connecting: { label: "Menghubungkan\u2026", dot: "bg-amber-500 animate-pulse", text: "text-amber-600" },
  reconnecting: { label: "Menyambungkan kembali\u2026", dot: "bg-amber-500 animate-pulse", text: "text-amber-600" },
  disconnected: { label: "Belum terhubung", dot: "bg-ink-300", text: "text-ink-500" },
  error: { label: "Gagal terhubung", dot: "bg-signal", text: "text-signal" },
  unsupported: { label: "Browser tidak didukung", dot: "bg-signal", text: "text-signal" },
};

export default function StatusBadge({ status }) {
  const config = CONFIG[status] ?? CONFIG.disconnected;
  return (
    <span className={clsx("inline-flex items-center gap-2 text-sm font-medium", config.text)}>
      <span className={clsx("h-2 w-2 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
