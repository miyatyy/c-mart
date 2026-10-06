import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 📱 Registrasi PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('✅ [PWA] Service Worker terdaftar dengan scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ [PWA] Registrasi Service Worker gagal:', err);
      });
  });
}