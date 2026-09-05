import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CHUNK_DELAY_MS,
  DEFAULT_CHUNK_SIZE,
  GENERIC_OPTIONAL_SERVICES,
  KNOWN_PRINTER_SERVICES,
} from "../constants/bluetooth";

/** Status koneksi yang bisa ditampilkan langsung ke UI. */
export const PRINTER_STATUS = {
  UNSUPPORTED: "unsupported",
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mencari characteristic yang bisa ditulis dari sebuah GATT server.
 * Mengembalikan characteristic pertama yang punya properti write atau
 * writeWithoutResponse — ini pendekatan umum karena setiap merek printer
 * memakai UUID characteristic yang berbeda-beda.
 */
async function findWritableCharacteristic(server) {
  const services = await server.getPrimaryServices();

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse
    );
    if (writable) return writable;
  }
  return null;
}

/**
 * Hook untuk mengelola koneksi ke printer thermal Bluetooth LE dan
 * mengirim byte ESC/POS ke printer tersebut.
 *
 * Contoh pemakaian:
 *   const { status, deviceName, connect, disconnect, print } = useBluetoothPrinter();
 *   await connect();
 *   await print(escposBytes);
 */
export function useBluetoothPrinter(options = {}) {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkDelayMs = options.chunkDelayMs ?? DEFAULT_CHUNK_DELAY_MS;

  const isSupported = typeof navigator !== "undefined" && !!navigator.bluetooth;

  const [status, setStatus] = useState(
    isSupported ? PRINTER_STATUS.DISCONNECTED : PRINTER_STATUS.UNSUPPORTED
  );
  const [deviceName, setDeviceName] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);

  const handleDisconnected = useCallback(() => {
    setStatus(PRINTER_STATUS.DISCONNECTED);
    setDeviceName(null);
    characteristicRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    const device = deviceRef.current;
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    handleDisconnected();
  }, [handleDisconnected]);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage(
        "Browser ini tidak mendukung Web Bluetooth API. Gunakan Chrome/Edge di desktop atau Android."
      );
      setStatus(PRINTER_STATUS.UNSUPPORTED);
      return;
    }

    setErrorMessage(null);
    setStatus(PRINTER_STATUS.CONNECTING);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [...KNOWN_PRINTER_SERVICES, ...GENERIC_OPTIONAL_SERVICES],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", handleDisconnected);

      const server = await device.gatt.connect();
      const characteristic = await findWritableCharacteristic(server);

      if (!characteristic) {
        throw new Error(
          "Printer terhubung tapi tidak ditemukan characteristic yang bisa ditulis. " +
            "Tambahkan UUID service printer Anda ke src/constants/bluetooth.js."
        );
      }

      characteristicRef.current = characteristic;
      setDeviceName(device.name || "Printer Bluetooth");
      setStatus(PRINTER_STATUS.CONNECTED);
    } catch (err) {
      // Pengguna membatalkan dialog pemilihan device bukan error fatal.
      if (err?.name === "NotFoundError") {
        setStatus(PRINTER_STATUS.DISCONNECTED);
        return;
      }
      console.error("Bluetooth connect error:", err);
      setErrorMessage(err?.message || "Gagal terhubung ke printer.");
      setStatus(PRINTER_STATUS.ERROR);
    }
  }, [handleDisconnected, isSupported]);

  /**
   * Mengirim data biner (Uint8Array) ke printer dalam potongan-potongan
   * kecil, karena koneksi BLE punya batas ukuran payload per paket.
   */
  const sendBytes = useCallback(
    async (bytes) => {
      const characteristic = characteristicRef.current;
      if (!characteristic) {
        throw new Error("Printer belum terhubung.");
      }

      const write = characteristic.properties.writeWithoutResponse
        ? (chunk) => characteristic.writeValueWithoutResponse(chunk)
        : (chunk) => characteristic.writeValue(chunk);

      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.slice(offset, offset + chunkSize);
        await write(chunk);
        if (chunkDelayMs > 0) await sleep(chunkDelayMs);
      }
    },
    [chunkDelayMs, chunkSize]
  );

  const print = useCallback(
    async (bytes) => {
      setIsPrinting(true);
      setErrorMessage(null);
      try {
        await sendBytes(bytes);
      } catch (err) {
        console.error("Bluetooth print error:", err);
        setErrorMessage(err?.message || "Gagal mengirim data ke printer.");
        throw err;
      } finally {
        setIsPrinting(false);
      }
    },
    [sendBytes]
  );

  useEffect(() => {
    return () => {
      const device = deviceRef.current;
      if (device?.gatt?.connected) device.gatt.disconnect();
    };
  }, []);

  return {
    isSupported,
    status,
    deviceName,
    errorMessage,
    isPrinting,
    connect,
    disconnect,
    print,
  };
}
