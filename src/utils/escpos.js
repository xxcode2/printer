/**
 * Builder perintah ESC/POS minimal yang dibutuhkan aplikasi ini:
 * inisialisasi printer, mengirim gambar raster (bitmap resi), feed baris,
 * dan potong kertas (jika printer mendukung auto-cutter).
 *
 * Referensi command set: ESC/POS Command Reference (umum dipakai lintas
 * merek: Epson, Xprinter, Zjiang, Goojprt, dll).
 */

const ESC = 0x1b;
const GS = 0x1d;

/** Menggabungkan beberapa array/typed-array angka menjadi satu Uint8Array. */
function concatBytes(chunks) {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** ESC @ — reset printer ke kondisi default. Selalu kirim ini di awal job cetak. */
export function initializePrinter() {
  return new Uint8Array([ESC, 0x40]);
}

/** Feed kertas sejumlah `lines` baris kosong. */
export function feedLines(lines = 3) {
  return new Uint8Array([ESC, 0x64, lines]);
}

/**
 * GS V — potong kertas. `partial=true` menyisakan sedikit kertas tersambung
 * (lebih aman untuk printer tanpa full-cutter). Diabaikan otomatis oleh
 * printer yang tidak punya cutter, jadi aman selalu dikirim.
 */
export function cutPaper(partial = true) {
  return new Uint8Array([GS, 0x56, partial ? 0x01 : 0x00]);
}

/**
 * Mengubah bitmap monokrom ({ width, height, bits }) menjadi perintah
 * ESC/POS raster image: GS v 0.
 *
 * Format command: GS v 0 m xL xH yL yH d1...dk
 *  - m       : 0 = normal, 1/2/3 = mode double width/height (kita pakai 0)
 *  - xL,xH   : lebar dalam BYTE (bukan pixel) — width harus kelipatan 8
 *  - yL,yH   : tinggi dalam pixel
 *  - d1..dk  : data bit, MSB dulu, 1 = titik hitam
 *
 * `bits` dari imageProcessor berisi 1 byte per pixel (0/1); di sini kita
 * pack jadi 1 bit per pixel sesuai kebutuhan ESC/POS, dan lebar akan
 * dibulatkan ke atas ke kelipatan 8 (padding kolom ekstra dibuat putih).
 */
export function bitmapToEscPosRaster({ width, height, bits }) {
  const widthBytes = Math.ceil(width / 8);
  const paddedWidth = widthBytes * 8;

  const imageBytes = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        const isBlack = x < width && bits[y * width + x] === 1;
        if (isBlack) byte |= 0x80 >> bit;
      }
      imageBytes[y * widthBytes + xByte] = byte;
    }
  }

  const header = new Uint8Array([
    GS,
    0x76,
    0x30,
    0x00, // m = 0
    widthBytes & 0xff, // xL
    (widthBytes >> 8) & 0xff, // xH
    height & 0xff, // yL
    (height >> 8) & 0xff, // yH
  ]);

  return { command: concatBytes([header, imageBytes]), paddedWidth };
}

/**
 * Menyusun satu paket lengkap job cetak: init -> gambar resi -> feed -> cut.
 * `copies` untuk mencetak beberapa rangkap sekaligus tanpa perlu klik ulang.
 */
export function buildPrintJob(bitmap, { feedAfter = 4, cut = true, copies = 1 } = {}) {
  const { command: imageCommand } = bitmapToEscPosRaster(bitmap);
  const parts = [initializePrinter()];

  for (let i = 0; i < copies; i++) {
    parts.push(imageCommand);
    parts.push(feedLines(feedAfter));
    if (cut) parts.push(cutPaper(true));
  }

  return concatBytes(parts);
}
