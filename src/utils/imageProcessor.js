/**
 * Utilitas pemrosesan gambar di sisi client (Canvas API) untuk mengubah
 * gambar resi apa pun menjadi bitmap monokrom 1-bit yang siap dikonversi
 * ke perintah ESC/POS.
 */

/**
 * Menggambar ulang sebuah source (HTMLImageElement / Canvas) ke canvas baru
 * dengan lebar tepat sesuai `targetWidth` (dalam dot/pixel), skala tinggi
 * menyesuaikan supaya rasio aspek tetap terjaga.
 */
export function resizeToWidth(source, targetWidth) {
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const targetHeight = Math.round((sourceHeight / sourceWidth) * targetWidth);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Mengonversi ImageData berwarna menjadi array grayscale (0-255 per pixel)
 * menggunakan bobot luminance standar.
 */
function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Alpha dianggap latar putih (resi biasanya transparan/putih).
    const alpha = data[i + 3] / 255;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[p] = luminance * alpha + 255 * (1 - alpha);
  }
  return gray;
}

/**
 * Dithering Floyd–Steinberg: mengubah grayscale menjadi hitam/putih murni
 * sambil menyebarkan "error" pembulatan ke pixel tetangga, hasilnya jauh
 * lebih enak dibaca untuk foto/label dibanding threshold biasa.
 * Mengembalikan Uint8Array berisi 0 (putih) atau 1 (hitam) per pixel.
 */
function floydSteinbergDither(gray, width, height, threshold) {
  const bitmap = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal < threshold ? 0 : 255;
      const error = oldVal - newVal;
      bitmap[idx] = newVal === 0 ? 1 : 0; // 1 = titik hitam yang dicetak

      const spread = (dx, dy, factor) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          gray[ny * width + nx] += error * factor;
        }
      };
      spread(1, 0, 7 / 16);
      spread(-1, 1, 3 / 16);
      spread(0, 1, 5 / 16);
      spread(1, 1, 1 / 16);
    }
  }

  return bitmap;
}

/** Threshold sederhana tanpa dithering — lebih tegas untuk teks/garis. */
function simpleThreshold(gray, threshold) {
  const bitmap = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    bitmap[i] = gray[i] < threshold ? 1 : 0;
  }
  return bitmap;
}

/**
 * Fungsi utama: canvas berwarna -> bitmap monokrom siap-cetak.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} opts
 * @param {number} opts.threshold - 0-255, makin kecil makin banyak area jadi hitam
 * @param {boolean} opts.dither - pakai Floyd-Steinberg atau threshold polos
 * @returns {{ width: number, height: number, bits: Uint8Array }} bits: 1=hitam, 0=putih, per pixel (bukan packed)
 */
export function canvasToMonochromeBitmap(canvas, { threshold = 180, dither = false } = {}) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGrayscale(imageData);

  const bits = dither
    ? floydSteinbergDither(gray, canvas.width, canvas.height, threshold)
    : simpleThreshold(gray, threshold);

  return { width: canvas.width, height: canvas.height, bits };
}

/**
 * Memotong baris putih (kosong) di bagian atas dan bawah bitmap.
 * Resi e-commerce sering punya margin besar di atas/bawah karena
 * format kertas A4. Fungsi ini menghemat kertas thermal dengan
 * membuang area kosong tersebut.
 *
 * @param {{ width: number, height: number, bits: Uint8Array }} bitmap
 * @param {number} [paddingPx=8] - jumlah pixel putih yang disisakan di atas/bawah
 * @returns {{ width: number, height: number, bits: Uint8Array }}
 */
export function cropWhitespace(bitmap, paddingPx = 8) {
  const { width, height, bits } = bitmap;

  // Cek apakah satu baris penuh berisi putih (semua 0 = tidak ada titik hitam)
  function isRowEmpty(y) {
    const offset = y * width;
    for (let x = 0; x < width; x++) {
      if (bits[offset + x] === 1) return false;
    }
    return true;
  }

  // Cari baris pertama yang ada konten dari atas
  let top = 0;
  while (top < height && isRowEmpty(top)) top++;

  // Cari baris terakhir yang ada konten dari bawah
  let bottom = height - 1;
  while (bottom > top && isRowEmpty(bottom)) bottom--;

  // Tambahkan sedikit padding supaya konten tidak mepet tepi
  const cropTop = Math.max(0, top - paddingPx);
  const cropBottom = Math.min(height - 1, bottom + paddingPx);
  const newHeight = cropBottom - cropTop + 1;

  // Kalau tidak ada perubahan, kembalikan bitmap asli
  if (cropTop === 0 && cropBottom === height - 1) return bitmap;

  const newBits = bits.slice(cropTop * width, (cropBottom + 1) * width);
  return { width, height: newHeight, bits: newBits };
}

/**
 * Merender bitmap monokrom (1=hitam per pixel) kembali ke sebuah canvas,
 * berguna untuk preview "seperti hasil cetak" di layar sebelum benar-benar
 * dikirim ke printer.
 */
export function renderMonochromeToCanvas({ width, height, bits }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);

  for (let i = 0; i < bits.length; i++) {
    const value = bits[i] ? 0 : 255; // hitam=0, putih=255
    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Membuat bitmap header logo dari sebuah gambar.
 * Logo di-scale ke `logoWidthPx` (default ~35% lebar kertas),
 * ditengahkan, dan ditambah padding + garis pemisah di bawahnya.
 *
 * @param {string} logoUrl - URL gambar logo
 * @param {number} paperWidthDots - lebar kertas dalam dot
 * @param {Object} [opts]
 * @param {number} [opts.logoWidthPx] - lebar logo dalam pixel
 * @param {number} [opts.paddingPx] - jarak atas/bawah logo
 * @returns {Promise<{ width: number, height: number, bits: Uint8Array }>}
 */
export async function createLogoHeader(logoUrl, paperWidthDots, { logoWidthPx, paddingPx = 12 } = {}) {
  const logoWidth = logoWidthPx || Math.round(paperWidthDots * 0.35);
  const framePadding = 6; // jarak antara logo dengan border frame
  const borderWidth = 1; // tebal border frame

  // Load logo image
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = logoUrl;
  });

  // Scale logo
  const logoHeight = Math.round((img.height / img.width) * logoWidth);

  // Hitung ukuran frame (border + padding + logo)
  const frameWidth = logoWidth + framePadding * 2 + borderWidth * 2;
  const frameHeight = logoHeight + framePadding * 2 + borderWidth * 2;

  const totalHeight = paddingPx + frameHeight + paddingPx + 2; // 2px garis pemisah

  // Gambar logo di tengah canvas putih
  const canvas = document.createElement("canvas");
  canvas.width = paperWidthDots;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, paperWidthDots, totalHeight);

  // Posisi frame (tengah horizontal)
  const frameX = Math.round((paperWidthDots - frameWidth) / 2);
  const frameY = paddingPx;

  // Gambar border frame (kotak hitam)
  ctx.fillStyle = "#000000";
  ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

  // Gambar area putih di dalam frame (di atas border hitam)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(frameX + borderWidth, frameY + borderWidth, frameWidth - borderWidth * 2, frameHeight - borderWidth * 2);

  // Gambar logo di tengah dalam frame
  const logoX = frameX + borderWidth + framePadding;
  const logoY = frameY + borderWidth + framePadding;
  ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);

  // Garis pemisah tipis di bawah
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, totalHeight - 1, paperWidthDots, 1);

  // Konversi ke monokrom
  const rawBitmap = canvasToMonochromeBitmap(canvas, { threshold: 180, dither: false });
  return cropWhitespace(rawBitmap, 4);
}

/**
 * Menggabungkan dua bitmap secara vertikal (atas + bawah).
 * Lebar harus sama. Kalau berbeda, yang lebih kecil di-pad putih.
 */
export function stackBitmaps(top, bottom) {
  const width = Math.max(top.width, bottom.width);
  const totalHeight = top.height + bottom.height;
  const combined = new Uint8Array(width * totalHeight);

  // Copy top bitmap (tengahkan kalau lebih sempit)
  const topOffset = Math.round((width - top.width) / 2);
  for (let y = 0; y < top.height; y++) {
    for (let x = 0; x < top.width; x++) {
      combined[y * width + topOffset + x] = top.bits[y * top.width + x];
    }
  }

  // Copy bottom bitmap
  const bottomOffset = Math.round((width - bottom.width) / 2);
  for (let y = 0; y < bottom.height; y++) {
    for (let x = 0; x < bottom.width; x++) {
      combined[(top.height + y) * width + bottomOffset + x] = bottom.bits[y * bottom.width + x];
    }
  }

  return { width, height: totalHeight, bits: combined };
}
