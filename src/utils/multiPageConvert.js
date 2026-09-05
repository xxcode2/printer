import { getPdfPageCount, renderPdfPageToCanvas } from "./pdfToCanvas";
import { canvasToMonochromeBitmap, cropWhitespace, resizeToWidth } from "./imageProcessor";

/**
 * Mengonversi halaman PDF menjadi array bitmap monokrom.
 * Bisa semua halaman atau hanya halaman tertentu.
 *
 * @param {File} file - File PDF
 * @param {Object} settings
 * @param {number} settings.paperWidthDots - lebar kertas dalam dot
 * @param {number} settings.threshold - 0-255
 * @param {boolean} settings.dither - pakai dithering atau tidak
 * @param {number[]} [pages] - daftar nomor halaman yang mau dikonversi (opsional, default = semua)
 * @param {function} [onProgress] - callback(currentPage, totalPages)
 * @returns {Promise<{ bitmaps: Array, pageCount: number }>}
 */
export async function convertAllPdfPages(file, { paperWidthDots, threshold, dither }, onProgress, pages) {
  const arrayBuffer = await file.arrayBuffer();
  const pageCount = await getPdfPageCount(arrayBuffer);
  const pagesToConvert = pages || Array.from({ length: pageCount }, (_, i) => i + 1);
  const bitmaps = [];

  for (let i = 0; i < pagesToConvert.length; i++) {
    const page = pagesToConvert[i];
    // pdfToCanvas sudah clone ArrayBuffer internally, jadi aman pakai buffer yang sama
    const { canvas } = await renderPdfPageToCanvas(arrayBuffer, {
      pageNumber: page,
      targetWidthPx: paperWidthDots * 3,
    });

    const resized = resizeToWidth(canvas, paperWidthDots);
    const rawBitmap = canvasToMonochromeBitmap(resized, { threshold, dither });
    const bitmap = cropWhitespace(rawBitmap);
    bitmaps.push(bitmap);

    if (onProgress) onProgress(i + 1, pagesToConvert.length);
  }

  return { bitmaps, pageCount };
}
