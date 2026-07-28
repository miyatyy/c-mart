import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Konfigurasi final untuk Antasari Mart (Siap Vercel & Development Lokal)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Tetap aman untuk akses jaringan lokal
    port: 5173,      // Port standar Vite
  },
  resolve: {
    alias: {
      '@': '/src',   // Menjaga agar import ke src tetap berfungsi
    },
  },
  build: {
    outDir: 'dist',  // Direktori output standar yang dibaca oleh Vercel
    sourcemap: false, // Mempercepat proses build dan menjaga keamanan kodingan di production
  },
})