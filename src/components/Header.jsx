export default function Header() {
  return (
    <header className="border-b border-ink-900/10 bg-paper-50">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
        <img
          src="/pakein.jpg"
          alt="PakeinAja"
          className="h-9 w-9 rounded-lg object-cover"
        />
        <div>
          <h1 className="font-display text-lg font-semibold leading-tight text-ink-900">
            Cetak Resi PakeinAja
          </h1>
          <p className="text-xs text-ink-500">Cetak resi marketplace langsung dari browser, cepat dan praktis</p>
        </div>
      </div>
    </header>
  );
}
