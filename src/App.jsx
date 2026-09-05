import { useState } from "react";
import Header from "./components/Header";
import PrinterPanel from "./components/PrinterPanel";
import FileUploader from "./components/FileUploader";
import ReceiptPreview from "./components/ReceiptPreview";
import PrintControls from "./components/PrintControls";
import { useBluetoothPrinter, PRINTER_STATUS } from "./hooks/useBluetoothPrinter";
import { useReceiptConverter } from "./hooks/useReceiptConverter";

const DEFAULT_SETTINGS = {
  paperWidthDots: 576, // 80mm paper, 72mm printable width (RPP02N)
  threshold: 180,
  dither: false,
  pageNumber: 1,
  pageRange: "", // kosong = semua halaman
  showLogo: true, // tampilkan logo PakeinAja di atas resi
};

export default function App() {
  const printer = useBluetoothPrinter();
  const [file, setFile] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const converter = useReceiptConverter(file, settings);

  const handleFileSelected = (newFile) => {
    setSettings((prev) => ({ ...prev, pageNumber: 1, pageRange: "" }));
    setFile(newFile);
  };

  const updateSettings = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  const canPrint = printer.status === PRINTER_STATUS.CONNECTED && converter.status === "ready";

  return (
    <div className="min-h-screen bg-paper-100">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Kolom kiri: kontrol printer & upload */}
          <div className="space-y-6">
            <PrinterPanel printer={printer} />
            <FileUploader file={file} onFileSelected={handleFileSelected} />
            <PrintControls printer={printer} bitmap={converter.bitmap} file={file} settings={{ ...settings, pageCount: converter.pageCount }} disabled={!canPrint} />
          </div>

          {/* Kolom kanan: preview & pengaturan konversi */}
          <ReceiptPreview
            file={file}
            settings={settings}
            onSettingsChange={updateSettings}
            converter={converter}
          />
        </div>
      </main>
    </div>
  );
}
