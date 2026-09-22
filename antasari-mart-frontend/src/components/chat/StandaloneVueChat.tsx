import React, { useEffect, useRef } from 'react';
import { createApp, type App as VueApp } from 'vue';
import CampusChatVue from './CampusChatVue.vue';

export interface StandaloneVueChatProps {
  theme?: string;
  campus?: any;
  onBack?: () => void;
  onRoomActiveChange?: (isActive: boolean) => void;
  roomId?: string;
  currentUserId?: string;
  currentUserName?: string;
  activeRoomName?: string;
  activeRoomAvatar?: string;
  activeRoomRole?: string;
}

export const StandaloneVueChat: React.FC<StandaloneVueChatProps> = ({
  theme,
  campus,
  onBack,
  onRoomActiveChange,
  roomId,
  currentUserId,
  currentUserName,
  activeRoomName,
  activeRoomAvatar,
  activeRoomRole,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<VueApp | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Bersihkan instance lama jika ada
    if (appRef.current) {
      appRef.current.unmount();
      appRef.current = null;
    }

    // Inisialisasi Native Vue 3 Standalone App
    const app = createApp(CampusChatVue, {
      roomId,
      currentUserId,
      currentUserName,
      activeRoomName,
      activeRoomAvatar,
      activeRoomRole,
      onBack: () => {
        if (onBack) onBack();
      },
    });

    app.mount(containerRef.current);
    appRef.current = app;

    if (onRoomActiveChange) {
      onRoomActiveChange(true);
    }

    return () => {
      if (appRef.current) {
        appRef.current.unmount();
        appRef.current = null;
      }
      if (onRoomActiveChange) {
        onRoomActiveChange(false);
      }
    };
  }, [roomId, currentUserId, currentUserName, activeRoomName, activeRoomAvatar, activeRoomRole]);

  return (
    <div
      ref={containerRef}
      className="standalone-vue-chat-container w-full h-[calc(100vh-64px)] flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden"
      style={{ minHeight: '520px' }}
    />
  );
};

export default StandaloneVueChat;
