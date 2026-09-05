import { getPdfPageCount, renderPdfPageToCanvas } from "./pdfToCanvas";
import { canvasToMonochromeBitmap, cropWhitespace, resizeToWidth } from "./imageProcessor";

/**
 * Mengonversi SEMUA halaman PDF menjadi array bitmap monokrom.
 * Digunakan untuk fitur "Cetak Semua Halaman" tanpa perlu konversi
 * satu per satu lewat UI.
 *
 * @param {File} file - File PDF
 * @param {Object} settings
 * @param {number} settings.paperWidthDots - lebar kertas dalam dot
 * @param {number} settings.threshold - 0-255
 * @param {boolean} settings.dither - pakai dithering atau tidak
 * @param {function} [onProgress] - callback(currentPage, totalPages)
 * @returns {Promise<{ bitmaps: Array, pageCount: number }>}
 */
export async function convertAllPdfPages(file, { paperWidthDots, threshold, dither }, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pageCount = await getPdfPageCount(arrayBuffer);
  const bitmaps = [];

  for (let page = 1; page <= pageCount; page++) {
    // pdfToCanvas sudah clone ArrayBuffer internally, jadi aman pakai buffer yang sama
    const { canvas } = await renderPdfPageToCanvas(arrayBuffer, {
      pageNumber: page,
      targetWidthPx: paperWidthDots * 3,
    });

    const resized = resizeToWidth(canvas, paperWidthDots);
    const rawBitmap = canvasToMonochromeBitmap(resized, { threshold, dither });
    const bitmap = cropWhitespace(rawBitmap);
    bitmaps.push(bitmap);

    if (onProgress) onProgress(page, pageCount);
  }

  return { bitmaps, pageCount };
}
