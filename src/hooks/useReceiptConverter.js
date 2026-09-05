import { useEffect, useState } from "react";
import { getPdfPageCount, loadImageFile, renderPdfPageToCanvas } from "../utils/pdfToCanvas";
import { canvasToMonochromeBitmap, createLogoHeader, cropWhitespace, renderMonochromeToCanvas, resizeToWidth, stackBitmaps } from "../utils/imageProcessor";

/**
 * Mengubah file resi (PDF/PNG/JPG) menjadi bitmap monokrom siap-cetak,
 * dan menyiapkan data URL untuk preview di layar.
 *
 * Pipeline: file -> canvas (render PDF atau load image) -> resize ke lebar
 * printer -> grayscale + threshold/dither -> bitmap 1-bit.
 *
 * Diproses ulang otomatis setiap kali file atau salah satu setting berubah.
 */
export function useReceiptConverter(file, { paperWidthDots, threshold, dither, pageNumber = 1, showLogo = true, logoSize = 35 }) {
  const [state, setState] = useState({
    status: "idle", // idle | loading | ready | error
    error: null,
    previewUrl: null,
    bitmap: null,
    pageCount: 1,
    thumbnails: [], // data URL kecil untuk setiap halaman PDF
  });

  // Generate thumbnail kecil untuk semua halaman PDF di background
  useEffect(() => {
    if (!file || file.type !== "application/pdf") {
      setState((prev) => ({ ...prev, thumbnails: [] }));
      return;
    }

    let cancelled = false;
    const THUMB_WIDTH = 120;

    (async () => {
      try {
        const ab = await file.arrayBuffer();
        const count = await getPdfPageCount(ab);
        const thumbs = [];

        for (let p = 1; p <= count; p++) {
          const { canvas } = await renderPdfPageToCanvas(
            await file.arrayBuffer(),
            { pageNumber: p, targetWidthPx: THUMB_WIDTH * 3 }
          );
          const resized = resizeToWidth(canvas, THUMB_WIDTH);
          const rawBmp = canvasToMonochromeBitmap(resized, { threshold, dither });
          const bmp = cropWhitespace(rawBmp);
          const thumbCanvas = renderMonochromeToCanvas(bmp);
          thumbs.push(thumbCanvas.toDataURL("image/png"));
          if (cancelled) return;
        }

        if (cancelled) return;
        setState((prev) => ({ ...prev, thumbnails: thumbs }));
      } catch (err) {
        console.error("Thumbnail generation error:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [file, threshold, dither]);

  useEffect(() => {
    if (!file) {
      setState({ status: "idle", error: null, previewUrl: null, bitmap: null, pageCount: 1, thumbnails: [] });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    (async () => {
      try {
        let sourceCanvas;
        let pageCount = 1;

        if (file.type === "application/pdf") {
          const arrayBuffer = await file.arrayBuffer();
          pageCount = await getPdfPageCount(arrayBuffer);
          const rendered = await renderPdfPageToCanvas(arrayBuffer, {
            pageNumber,
            targetWidthPx: paperWidthDots * 3, // render tinggi dulu, resize turun = tajam
          });
          sourceCanvas = rendered.canvas;
        } else {
          const img = await loadImageFile(file);
          sourceCanvas = img;
        }

        const resized = resizeToWidth(sourceCanvas, paperWidthDots);
        const rawBitmap = canvasToMonochromeBitmap(resized, { threshold, dither });
        let bitmap = cropWhitespace(rawBitmap);

        // Sisipkan logo PakeinAja di atas resi kalau diaktifkan
        if (showLogo) {
          try {
            const logoHeader = await createLogoHeader("/pakein.jpg", paperWidthDots, { logoWidthPx: Math.round(paperWidthDots * logoSize / 100) });
            bitmap = stackBitmaps(logoHeader, bitmap);
          } catch (logoErr) {
            console.warn("Logo header gagal dimuat, cetak tanpa logo:", logoErr);
          }
        }

        const previewCanvas = renderMonochromeToCanvas(bitmap);

        if (cancelled) return;
        setState((prev) => ({
          status: "ready",
          error: null,
          previewUrl: previewCanvas.toDataURL("image/png"),
          bitmap,
          pageCount,
          thumbnails: prev.thumbnails,
        }));
      } catch (err) {
        console.error("Receipt conversion error:", err);
        if (cancelled) return;
        setState((prev) => ({
          status: "error",
          error: err?.message || "Gagal memproses file resi.",
          previewUrl: null,
          bitmap: null,
          pageCount: 1,
          thumbnails: prev.thumbnails,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, paperWidthDots, threshold, dither, pageNumber]);

  return state;
}
