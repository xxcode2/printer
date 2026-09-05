/**
 * Kumpulan UUID service Bluetooth LE yang umum dipakai oleh printer thermal
 * murah (merek generik seperti Goojprt, MPT, HM-A300, Zjiang, dsb).
 *
 * Web Bluetooth API mengharuskan kita mendaftarkan service yang ingin kita
 * akses lewat `optionalServices` SEBELUM melakukan request device — kita
 * tidak bisa "menjelajah" service yang belum didaftarkan karena alasan
 * keamanan browser. Karena setiap merek printer punya UUID custom yang
 * berbeda-beda, strategi paling aman adalah mendaftarkan semua UUID yang
 * lazim ditemukan di lapangan, lalu saat sudah connect kita cari secara
 * otomatis characteristic yang bisa ditulis (write / writeWithoutResponse).
 *
 * Kalau printer Anda ternyata tidak terdeteksi, cara termudah menambah
 * dukungan: buka chrome://bluetooth-internals saat printer ter-pair, lihat
 * UUID service & characteristic-nya, lalu tambahkan ke daftar di bawah.
 */
export const KNOWN_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // umum di printer generik Cina (SPP-like)
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC / Microchip transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // beberapa printer portable BLE
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
];

// Service standar yang boleh selalu diminta agar bisa membaca nama/metadata.
export const GENERIC_OPTIONAL_SERVICES = ["generic_access", "device_information"];

// Ukuran satu "potongan" data yang dikirim per writeValue().
// Sebagian besar modul BLE hanya nyaman menerima ~20 byte per paket,
// tapi banyak printer modern menerima jauh lebih besar. Nilai ini bisa
// disetel oleh pengguna lanjutan lewat opsi hook jika printer mereka rewel.
export const DEFAULT_CHUNK_SIZE = 180;

// Jeda (ms) antar pengiriman chunk agar buffer printer tidak overflow.
export const DEFAULT_CHUNK_DELAY_MS = 12;
