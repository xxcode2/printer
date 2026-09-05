import { Bluetooth, BluetoothConnected, Unplug } from "lucide-react";
import Button from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";
import { PRINTER_STATUS } from "../hooks/useBluetoothPrinter";

export default function PrinterPanel({ printer }) {
  const { status, deviceName, errorMessage, connect, disconnect, isSupported, isReconnecting } = printer;
  const isConnected = status === PRINTER_STATUS.CONNECTED;
  const isConnecting = status === PRINTER_STATUS.CONNECTING;

  // Tampilkan status "reconnecting" kalau printer sedang mencoba sambung ulang
  const badgeStatus = isReconnecting ? "reconnecting" : status;

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-ink-900">Printer</h2>
          <div className="mt-1.5">
            <StatusBadge status={badgeStatus} />
          </div>
          {isConnected && deviceName && (
            <p className="mt-1 font-mono text-xs text-ink-500">{deviceName}</p>
          )}
        </div>

        <div className="rounded-lg bg-paper-100 p-2.5 text-ink-700">
          {isConnected ? <BluetoothConnected size={20} /> : <Bluetooth size={20} />}
        </div>
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-signal/5 px-3 py-2 text-xs text-signal">{errorMessage}</p>
      )}

      {!isSupported && (
        <p className="mt-3 rounded-lg bg-signal/5 px-3 py-2 text-xs text-signal">
          Buka aplikasi ini lewat Chrome atau Edge (desktop/Android) — Web Bluetooth belum
          didukung Safari/Firefox.
        </p>
      )}

      <div className="mt-4">
        {isConnected ? (
          <Button variant="secondary" icon={Unplug} onClick={disconnect} className="w-full">
            Putuskan Koneksi
          </Button>
        ) : (
          <Button
            icon={Bluetooth}
            onClick={connect}
            loading={isConnecting}
            disabled={!isSupported}
            className="w-full"
          >
            Hubungkan Printer
          </Button>
        )}
      </div>
    </div>
  );
}
