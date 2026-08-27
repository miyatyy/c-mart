import React from 'react';

export default function TanyaPenjualButton({ storeId, storeName, onOpenChatRoom }) {
  const handlePressTanyaPenjual = () => {
    const currentUser = JSON.parse(localStorage.getItem('am_user_session') || localStorage.getItem('am_current_user') || '{"email": "user@gmail.com", "nama": "Pengguna", "role": "buyer"}');
    const chatId = `room_${storeId}_${currentUser.email}`;

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
        backgroundColor: 'var(--am-primary, #0077B6)',
        padding: '10px 15px',
        borderRadius: 8,
        border: 'none',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      💬 Tanya Penjual
    </button>
  );
}
