import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'digitaljagran.com',
      'www.digitaljagran.com',
      'localhost'
    ],
    hmr: mode === 'development' ? true : false,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    sourcemap: false,
  },
}))
