import { Receipt } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-ink-900/10 bg-paper-50">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
        <div className="rounded-lg bg-ink-900 p-2 text-paper-50">
          <Receipt size={18} />
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight text-ink-900">
            Cetak Resi
          </h1>
          <p className="text-xs text-ink-500">Langsung ke printer thermal Bluetooth, tanpa aplikasi pihak ketiga</p>
        </div>
      </div>
    </header>
  );
}
