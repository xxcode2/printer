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

// Key localStorage buat inget printer terakhir yang berhasil terhubung,
// supaya bisa disambungkan otomatis lagi tiap app dibuka tanpa perlu klik
// "Hubungkan Printer" berulang-ulang.
const LAST_DEVICE_ID_KEY = "cetak-resi:last-printer-device-id";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredDeviceId() {
  try {
    return localStorage.getItem(LAST_DEVICE_ID_KEY);
  } catch {
    // localStorage bisa saja diblokir (mis. mode private ketat) — abaikan, bukan fatal
    return null;
  }
}

function storeDeviceId(id) {
  try {
    localStorage.setItem(LAST_DEVICE_ID_KEY, id);
  } catch {
    // abaikan, fitur auto-reconnect cukup dilewati kalau localStorage tidak bisa dipakai
  }
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
  const maxReconnectAttempts = options.maxReconnectAttempts ?? 3;

  const isSupported = typeof navigator !== "undefined" && !!navigator.bluetooth;
  // getDevices() adalah API "persistent permissions" — mengembalikan device yang
  // origin ini sudah pernah diizinkan aksesnya, tanpa perlu dialog requestDevice()
  // lagi. Baru didukung Chrome/Edge versi cukup baru, jadi tetap dicek keberadaannya.
  const supportsPersistentPermissions =
    isSupported && typeof navigator.bluetooth.getDevices === "function";

  const [status, setStatus] = useState(
    isSupported ? PRINTER_STATUS.DISCONNECTED : PRINTER_STATUS.UNSUPPORTED
  );
  const [deviceName, setDeviceName] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  const deviceRef = useRef(null);
  const characteristicRef = useRef(null);
  const userDisconnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);

  /**
   * Menyambungkan GATT server dari sebuah BluetoothDevice yang sudah didapat
   * (baik dari dialog requestDevice() maupun dari getDevices()), mencari
   * characteristic yang bisa ditulis, lalu mengupdate semua state terkait.
   * Dipakai bersama oleh connect() manual dan proses auto-reconnect.
   */
  const connectToDevice = useCallback(async (device) => {
    userDisconnectedRef.current = false;
    reconnectAttemptsRef.current = 0;
    deviceRef.current = device;
    device.addEventListener("gattserverdisconnected", handleDisconnectedRef.current);

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
    if (device.id) storeDeviceId(device.id);
  }, []);

  /**
   * Mencoba menyambungkan kembali ke device yang sama setelah disconnect
   * tidak disengaja. Menggunakan exponential backoff sederhana.
   */
  const attemptReconnect = useCallback(async (device) => {
    if (userDisconnectedRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      return;
    }

    reconnectAttemptsRef.current += 1;
    setIsReconnecting(true);
    setStatus(PRINTER_STATUS.CONNECTING);

    const delay = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), 5000);
    await sleep(delay);

    // Pastikan kita masih mau reconnect (user bisa saja disconnect di tengah tunggu)
    if (userDisconnectedRef.current) {
      setIsReconnecting(false);
      return;
    }

    try {
      const server = await device.gatt.connect();
      const characteristic = await findWritableCharacteristic(server);

      if (!characteristic) {
        throw new Error("Karakteristik writable tidak ditemukan setelah reconnect.");
      }

      characteristicRef.current = characteristic;
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      setStatus(PRINTER_STATUS.CONNECTED);
    } catch (err) {
      console.warn(`Reconnect attempt ${reconnectAttemptsRef.current} failed:`, err.message);
      // Jika gagal, handleDisconnected akan dipanggil lagi oleh GATT event,
      // yang akan memicu attemptReconnect lagi secara rekursif.
      setIsReconnecting(false);
    }
  }, [maxReconnectAttempts]);

  const handleDisconnected = useCallback(() => {
    const device = deviceRef.current;
    setStatus(PRINTER_STATUS.DISCONNECTED);
    characteristicRef.current = null;

    // Hanya auto-reconnect jika disconnect bukan oleh user
    if (!userDisconnectedRef.current && device?.gatt) {
      attemptReconnect(device);
    } else {
      setDeviceName(null);
    }
  }, [attemptReconnect]);

  // handleDisconnected dipakai di dalam connectToDevice lewat ref, biar
  // connectToDevice tidak perlu didefinisikan ulang tiap handleDisconnected berubah
  // (menghindari urutan deklarasi useCallback yang saling silang).
  const handleDisconnectedRef = useRef(handleDisconnected);
  useEffect(() => {
    handleDisconnectedRef.current = handleDisconnected;
  }, [handleDisconnected]);

  const disconnect = useCallback(() => {
    userDisconnectedRef.current = true;
    reconnectAttemptsRef.current = 0;
    setIsReconnecting(false);
    const device = deviceRef.current;
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDeviceName(null);
    setStatus(PRINTER_STATUS.DISCONNECTED);
    characteristicRef.current = null;
  }, []);

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

      await connectToDevice(device);
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
  }, [connectToDevice, isSupported]);

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

  // Auto-reconnect ke printer terakhir begitu app dibuka, tanpa perlu klik
  // "Hubungkan Printer" lagi. Hanya jalan kalau: browser mendukung persistent
  // permissions, ada device id tersimpan dari sesi sebelumnya, dan device
  // tsb masih ada di daftar izin origin ini (belum di-revoke lewat chrome://bluetooth-internals
  // atau dilupakan manual).
  useEffect(() => {
    if (!supportsPersistentPermissions) return;

    const lastDeviceId = getStoredDeviceId();
    if (!lastDeviceId) return;

    let cancelled = false;

    (async () => {
      try {
        const devices = await navigator.bluetooth.getDevices();
        const device = devices.find((d) => d.id === lastDeviceId);
        if (!device || cancelled) return;

        setIsAutoConnecting(true);
        setStatus(PRINTER_STATUS.CONNECTING);
        await connectToDevice(device);
      } catch (err) {
        // Printer mungkin sedang mati/di luar jangkauan — gagal diam-diam,
        // user tetap bisa klik "Hubungkan Printer" manual seperti biasa.
        console.warn("Auto-reconnect ke printer terakhir gagal:", err?.message);
        if (!cancelled) setStatus(PRINTER_STATUS.DISCONNECTED);
      } finally {
        if (!cancelled) setIsAutoConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      const device = deviceRef.current;
      if (device?.gatt?.connected) device.gatt.disconnect();
    };
  }, []);

  return {
    isSupported,
    supportsPersistentPermissions,
    status,
    deviceName,
    errorMessage,
    isPrinting,
    isReconnecting,
    isAutoConnecting,
    connect,
    disconnect,
    print,
  };
}
