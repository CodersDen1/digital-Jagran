import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:5001" },
  },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: { sourcemap: false },
});
