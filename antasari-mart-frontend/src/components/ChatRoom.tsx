import React, { useState } from 'react';
import type { ThemeMode } from '../types';

interface ChatRoomProps {
  theme: ThemeMode;
  chatId: string;
  storeId: string;
  storeName: string;
  currentUser: { email: string; nama: string; role: string };
  onBack: () => void;
}

export default function ChatRoom({ storeName, currentUser, onBack }: ChatRoomProps) {
  const [messages, setMessages] = useState<Array<{ id: string; sender: string; text: string; time: string }>>([
    { 
      id: '1', 
      sender: currentUser.nama || 'Pengguna', 
      text: `Halo Kak, mau nanya produk ini apakah stoknya masih ada?`, 
      time: '14.16' 
    },
    { 
      id: '2', 
      sender: storeName, 
      text: `Halo Kak ${currentUser.nama || 'Kak'}, ada yang bisa kami bantu? Stok tersedia ya!`, 
      time: '14.18' 
    }
  ]);
  
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

    const newMsg = {
      id: Date.now().toString(),
      sender: currentUser.nama || 'Pengguna',
      text: inputText,
      time: currentTime
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#efeae2', // Warna latar khas WhatsApp Web
      maxWidth: '100%', 
      margin: '0 auto',
      fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif'
    }}>
      
      {/* 1. HEADER CHAT (Gaya WhatsApp: Warna Hijau Tua Khas WA / Dark Mode) */}
      <div style={{ 
        padding: '10px 16px', 
        backgroundColor: '#005c4b', // Hijau khas WA Header
        color: '#fff',
        display: 'flex', 
        alignItems: 'center', 
        gap: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        zIndex: 10
      }}>
        <button 
          onClick={onBack} 
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 22, 
            cursor: 'pointer', 
            color: '#fff',
            padding: 0,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ←
        </button>
        
        {/* Foto Profil Bulat & Nama Toko */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', backgroundColor: '#667781', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' 
          }}>
            {storeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: '1.2' }}>{storeName}</div>
            <div style={{ fontSize: 11, color: '#e2fdd9' }}>online</div>
          </div>
        </div>
      </div>

      {/* 2. BODY RUANG CHAT (Daftar Gelembung Pesan) */}
      <div style={{ 
        flex: 1, 
        padding: '16px 20px', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6,
        backgroundImage: 'radial-gradient(#d1d7db 0.75px, transparent 0.75px)', // Efek wallpaper titik-titik tipis khas WA
        backgroundSize: '24px 24px'
      }}>
        {messages.map(msg => {
          const isMe = msg.sender === (currentUser.nama || 'Pengguna');
          return (
            <div 
              key={msg.id} 
              style={{ 
                alignSelf: isMe ? 'flex-end' : 'flex-start', 
                maxWidth: '75%',
                marginBottom: 2
              }}
            >
              {/* Gelembung Pesan ala WhatsApp */}
              <div style={{
                padding: '8px 12px 6px 12px', 
                borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                backgroundColor: isMe ? '#d9fdd3' : '#ffffff', // Hijau muda untuk pengirim, Putih untuk lawan bicara
                color: '#111b21',
                boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
                position: 'relative',
                wordBreak: 'break-word'
              }}>
                <span style={{ fontSize: 14.5, lineHeight: '1.4', display: 'inline', paddingRight: 45 }}>
                  {msg.text}
                </span>
                
                {/* Waktu & Centang Biru di pojok kanan bawah gelembung */}
                <div style={{ 
                  fontSize: 10, 
                  color: '#667781', 
                  float: 'right',
                  marginLeft: 8,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  position: 'relative',
                  bottom: -2
                }}>
                  <span>{msg.time}</span>
                  {isMe && <span style={{ color: '#53bdeb', fontSize: 12, fontWeight: 'bold' }}>✓✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. FOOTER / INPUT KETIK PESAN (Gaya WhatsApp) */}
      <form 
        onSubmit={handleSendMessage} 
        style={{ 
          padding: '10px 16px', 
          backgroundColor: '#f0f2f5', 
          display: 'flex', 
          alignItems: 'center',
          gap: 8 
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ketik pesan..."
          style={{ 
            flex: 1, 
            padding: '11px 16px', 
            borderRadius: 8, 
            border: 'none', 
            outline: 'none', 
            backgroundColor: '#ffffff', 
            color: '#111b21',
            fontSize: 15,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        />
        
        {/* Tombol Kirim Bulat Hijau Khas WhatsApp */}
        <button 
          type="submit" 
          style={{ 
            width: 45, 
            height: 45, 
            backgroundColor: '#00a884', // Hijau tombol kirim WA
            color: '#fff', 
            border: 'none', 
            borderRadius: '50%', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        >
          ➤
        </button>
      </form>
    </div>
  );
}