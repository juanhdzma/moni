/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // chart.js + treemap are needed by the landing tab, so splitting them would not reduce first load; 159 kB gzip on a LAN
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: { TZ: 'America/Bogota' },
  },
})
