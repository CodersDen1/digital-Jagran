import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: [
      'crm.digitaljagran.com',
      'cms.digitaljagran.com',
      'localhost'
    ],
    hmr: mode === 'development' ? true : false,
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
  build: {
    sourcemap: false,
  },
}))
