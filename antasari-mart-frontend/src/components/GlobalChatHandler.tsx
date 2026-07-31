import { useEffect } from 'react';

export default function GlobalChatHandler() {
  useEffect(() => {
    const handleOpenChatEvent = (e: any) => {
      const { sellerId, sellerName, productName } = e.detail;

      // Simpan data target lengkap dengan nama produknya
      localStorage.setItem('am_target_chat', JSON.stringify({
        email: sellerId,
        nama: sellerName,
        productName: productName
      }));

      // Klik menu pesan/chat di sidebar secara otomatis untuk berpindah halaman
      const chatButton = document.querySelector('[data-view="chat"]') as HTMLElement ||
                         Array.from(document.querySelectorAll('button, a, div')).find(el => el.textContent?.includes('Pesan') || el.textContent?.includes('Chat')) as HTMLElement;
      
      if (chatButton) {
        chatButton.click();
      }
    };

    window.addEventListener('open-antasarimart-chat', handleOpenChatEvent as EventListener);
    return () => {
      window.removeEventListener('open-antasarimart-chat', handleOpenChatEvent as EventListener);
    };
  }, []);

  return null;
}