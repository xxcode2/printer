import { getPdfPageCount, renderPdfPageToCanvas } from "./pdfToCanvas";
import { canvasToMonochromeBitmap, resizeToWidth } from "./imageProcessor";

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
    // Render ulang ArrayBuffer karena pdf.js bisa consume data-nya
    const ab = await file.arrayBuffer();
    const { canvas } = await renderPdfPageToCanvas(ab, {
      pageNumber: page,
      targetWidthPx: paperWidthDots * 3,
    });

    const resized = resizeToWidth(canvas, paperWidthDots);
    const bitmap = canvasToMonochromeBitmap(resized, { threshold, dither });
    bitmaps.push(bitmap);

    if (onProgress) onProgress(page, pageCount);
  }

  return { bitmaps, pageCount };
}
