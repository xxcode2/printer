import * as pdfjsLib from "pdfjs-dist";
// Trik Vite: import worker sebagai URL supaya ikut ter-bundle dengan benar
// tanpa perlu menaruh file worker manual di folder public/.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Merender halaman pertama sebuah file PDF (ArrayBuffer) menjadi
 * HTMLCanvasElement. `targetWidthPx` menentukan resolusi render awal —
 * usahakan cukup tinggi (mis. 2-3x lebar printer) agar hasil resize ke
 * lebar printer nanti tetap tajam, bukan pecah/blur.
 */
export async function renderPdfPageToCanvas(arrayBuffer, { pageNumber = 1, targetWidthPx = 1200 } = {}) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);

  const baseViewport = page.getViewport({ scale: 1 });
  const scale = targetWidthPx / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  const ctx = canvas.getContext("2d");
  // PDF resi biasanya punya background transparan; paksa putih dulu agar
  // area kosong tidak ikut jadi hitam saat threshold nanti.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  return { canvas, pageCount: pdf.numPages };
}

/** Mengembalikan jumlah halaman total dari sebuah PDF, untuk UI pemilih halaman. */
export async function getPdfPageCount(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

/** Memuat file gambar (PNG/JPG) menjadi HTMLImageElement siap dipakai canvas. */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      reject(err);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
