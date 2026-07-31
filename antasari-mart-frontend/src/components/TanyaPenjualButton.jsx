import React from 'react';

export default function TanyaPenjualButton({ storeId, storeName, onOpenChatRoom }) {
  const handlePressTanyaPenjual = () => {
    // Ambil data user aktif dari localStorage
    const currentUser = JSON.parse(localStorage.getItem('am_current_user') || '{"email": "user@gmail.com", "nama": "Pengguna", "role": "buyer"}');
    
    // Buat ID unik room chat
    const chatId = `room_${storeId}_${currentUser.email}`;

    // Panggil fungsi pembuka chat yang dikirim dari parent
    if (onOpenChatRoom) {
      onOpenChatRoom({
        chatId,
        storeId,
        storeName,
        currentUser
      });
    }
  };

  return (
    <button 
      onClick={handlePressTanyaPenjual}
      style={{
        backgroundColor: 'var(--am-primary, #2e7d32)',
        padding: '10px 15px',
        borderRadius: 8,
        border: 'none',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItem: 'center',
        gap: 6
      }}
    >
      💬 Tanya Penjual
    </button>
  );
}