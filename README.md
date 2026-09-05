# Cetak Resi — Thermal Bluetooth Printer

Aplikasi frontend (React + Vite + Tailwind) untuk mencetak resi e-commerce (PDF/PNG/JPG) langsung ke printer thermal Bluetooth lewat Web Bluetooth API — tanpa aplikasi pihak ketiga.

## 1. Persyaratan

- Node.js 18+ dan npm
- Browser **Chrome** atau **Edge** versi terbaru (desktop atau Android). Web Bluetooth API **tidak didukung** Safari maupun Firefox.
- Printer thermal Bluetooth (BLE) yang sudah menyala dan dalam mode discoverable.

## 2. Instalasi & Menjalankan di Localhost

```bash
# 1. Masuk ke folder project
cd thermal-print-app

# 2. Install semua dependency
npm install

# 3. Jalankan development server
npm run dev
```

Vite akan menampilkan URL seperti `http://localhost:5173`. Buka URL tersebut di Chrome/Edge.

> Web Bluetooth API mengharuskan "secure context" (HTTPS atau `localhost`). Karena kita akses lewat `localhost`, ini sudah otomatis aman — tidak perlu setup HTTPS manual untuk development.

## 3. Cara Pakai

1. Klik **Hubungkan Printer** → pilih printer Bluetooth Anda dari dialog yang muncul.
2. Setelah status berubah jadi **Terhubung**, unggah file resi (PDF/PNG/JPG) di panel **Resi**.
3. Atur **lebar kertas** (58mm/80mm), **threshold**, dan **dithering** sambil melihat preview hasil konversi di kanan.
4. Klik **Print**.

## 4. Struktur Folder

```
src/
├── components/          # Komponen UI (presentational)
│   ├── ui/               # Komponen primitif (Button, StatusBadge)
│   ├── Header.jsx
│   ├── PrinterPanel.jsx
│   ├── FileUploader.jsx
│   ├── ReceiptPreview.jsx
│   └── PrintControls.jsx
├── hooks/
│   ├── useBluetoothPrinter.js   # Semua logika Web Bluetooth (connect/disconnect/kirim data)
│   └── useReceiptConverter.js   # Pipeline file -> canvas -> bitmap monokrom
├── utils/
│   ├── pdfToCanvas.js     # Render PDF (pdf.js) & load gambar ke canvas
│   ├── imageProcessor.js  # Grayscale, threshold, Floyd-Steinberg dithering
│   └── escpos.js          # Builder perintah ESC/POS (init, raster image, cut)
├── constants/
│   └── bluetooth.js       # Daftar UUID service printer yang dikenal
├── App.jsx
└── main.jsx
```

## 5. Jika Printer Tidak Terdeteksi / Gagal Kirim Data

Setiap merek printer thermal murah punya UUID service/characteristic Bluetooth yang berbeda. Aplikasi ini sudah mencoba beberapa UUID yang paling umum ditemukan (`src/constants/bluetooth.js`) dan otomatis mencari characteristic yang bisa ditulis begitu terhubung.

Kalau printer Anda tetap tidak terdeteksi:

1. Pastikan printer benar-benar printer **BLE** (Bluetooth Low Energy), bukan Bluetooth Classic/SPP saja — Web Bluetooth API hanya bisa bicara dengan BLE.
2. Saat printer sedang ter-pair, buka `chrome://bluetooth-internals` di tab baru, cari device Anda, lihat daftar **Service** dan **Characteristic**-nya.
3. Tambahkan UUID service yang muncul ke array `KNOWN_PRINTER_SERVICES` di `src/constants/bluetooth.js`, lalu refresh dan coba hubungkan lagi.
4. Jika data terkirim tapi hasil cetak berantakan/putus-putus, coba perkecil `DEFAULT_CHUNK_SIZE` di file yang sama (mis. dari 180 ke 20) — beberapa printer lama hanya kuat menerima potongan kecil per pengiriman.

## 6. Rencana Pengembangan Lanjutan (SaaS)

Struktur folder sudah disiapkan agar mudah ditambah:

- `src/pages/` — sudah dibuat kosong, siap diisi halaman Login/Register/Dashboard ketika Anda menambahkan routing (mis. `react-router-dom`).
- Logika Bluetooth & konversi gambar sepenuhnya terpisah dari komponen UI (custom hooks + utils murni), sehingga bisa dipakai ulang di halaman baru tanpa duplikasi.
- Untuk billing/langganan, tambahkan context/provider baru (mis. `src/context/AuthContext.jsx`, `src/context/BillingContext.jsx`) dan bungkus di `main.jsx` — tidak perlu mengubah struktur yang sudah ada.

## 7. Catatan Teknis Penting

- **Kenapa harus dikonversi ke bitmap dulu?** Printer thermal murah tidak punya rendering engine PDF/font vektor. Satu-satunya bahasa yang mereka pahami untuk gambar adalah *raster bitmap* 1-bit lewat perintah ESC/POS `GS v 0`. Karena itu PDF/gambar apa pun harus "difoto" jadi bitmap hitam-putih dulu sebelum dikirim.
- **Kenapa dikirim per-chunk?** GATT characteristic write punya batas ukuran payload (tergantung MTU koneksi, umumnya puluhan-ratusan byte). Mengirim seluruh gambar sekaligus akan gagal atau membuat data korup, karena itu `useBluetoothPrinter` memecahnya jadi potongan kecil dengan jeda antar pengiriman.
