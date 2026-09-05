import { useEffect, useState } from "react";
import { getPdfPageCount, loadImageFile, renderPdfPageToCanvas } from "../utils/pdfToCanvas";
import { canvasToMonochromeBitmap, renderMonochromeToCanvas, resizeToWidth } from "../utils/imageProcessor";

/**
 * Mengubah file resi (PDF/PNG/JPG) menjadi bitmap monokrom siap-cetak,
 * dan menyiapkan data URL untuk preview di layar.
 *
 * Pipeline: file -> canvas (render PDF atau load image) -> resize ke lebar
 * printer -> grayscale + threshold/dither -> bitmap 1-bit.
 *
 * Diproses ulang otomatis setiap kali file atau salah satu setting berubah.
 */
export function useReceiptConverter(file, { paperWidthDots, threshold, dither, pageNumber = 1 }) {
  const [state, setState] = useState({
    status: "idle", // idle | loading | ready | error
    error: null,
    previewUrl: null,
    bitmap: null,
    pageCount: 1,
  });

  useEffect(() => {
    if (!file) {
      setState({ status: "idle", error: null, previewUrl: null, bitmap: null, pageCount: 1 });
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
        const bitmap = canvasToMonochromeBitmap(resized, { threshold, dither });
        const previewCanvas = renderMonochromeToCanvas(bitmap);

        if (cancelled) return;
        setState({
          status: "ready",
          error: null,
          previewUrl: previewCanvas.toDataURL("image/png"),
          bitmap,
          pageCount,
        });
      } catch (err) {
        console.error("Receipt conversion error:", err);
        if (cancelled) return;
        setState({
          status: "error",
          error: err?.message || "Gagal memproses file resi.",
          previewUrl: null,
          bitmap: null,
          pageCount: 1,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, paperWidthDots, threshold, dither, pageNumber]);

  return state;
}
