import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurasi final untuk Antasari Mart
// Menghapus dependensi ke file .figma yang menyebabkan error
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Memungkinkan akses melalui network
    port: 5173,      // Port standar Vite
  },
  resolve: {
    alias: {
      // Menjaga agar import ke src tetap berfungsi
      '@': '/src',
    },
  },
})