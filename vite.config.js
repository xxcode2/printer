import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Web Bluetooth API hanya berjalan di konteks "secure context" (HTTPS atau
// localhost). Vite dev server default (localhost) sudah aman untuk testing.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  server: {
    host: true, // agar bisa diakses dari HP di jaringan yang sama (opsional)
  },
});
