import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "/newsroom/",
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: { "/api": "http://localhost:5001" },
  },
  preview: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: { sourcemap: false },
});
