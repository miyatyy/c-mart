import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import GlobalChatHandler from './components/GlobalChatHandler' // <--- Diimpor ke sini

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <GlobalChatHandler theme="modern" /> {/* <--- Ditambahkan secara global agar fitur chat langsung aktif */}
  </React.StrictMode>,
)