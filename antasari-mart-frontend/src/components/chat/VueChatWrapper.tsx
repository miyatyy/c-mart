import React, { useEffect, useRef } from 'react';
import { createApp, reactive, type App as VueApp } from 'vue';
import VueFrankenChat from './VueFrankenChat.vue';

export interface VueChatWrapperProps {
  roomId?: string;
  currentUserId?: string;
  currentUserName?: string;
  activeRoomName?: string;
  activeRoomAvatar?: string;
  activeRoomRole?: string;
  messages?: any[];
  isPeerTyping?: boolean;
  peerTypingText?: string;
  onSendMessage?: (text: string) => void;
  onBack?: () => void;
  onSwitchEngine?: () => void;
}

export default function VueChatWrapper(props: VueChatWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vueAppRef = useRef<VueApp | null>(null);
  const reactiveStateRef = useRef<any>(null);

  // 🚀 Mount Vue 3 Application to Host React DOM Container (Mount Once)
  useEffect(() => {
    if (!containerRef.current) return;

    // Create a reactive state object that Vue can track
    const state = reactive({
      roomId: props.roomId,
      currentUserId: props.currentUserId,
      currentUserName: props.currentUserName,
      activeRoomName: props.activeRoomName,
      activeRoomAvatar: props.activeRoomAvatar,
      activeRoomRole: props.activeRoomRole,
      messages: props.messages || [],
      isPeerTyping: props.isPeerTyping || false,
      peerTypingText: props.peerTypingText || '',
      onSendMessage: (text: string) => {
        if (props.onSendMessage) {
          props.onSendMessage(text);
        }
      },
      onBack: () => {
        if (props.onBack) {
          props.onBack();
        }
      },
      onSwitchEngine: () => {
        if (props.onSwitchEngine) {
          props.onSwitchEngine();
        }
      }
    });

    reactiveStateRef.current = state;

    // Create and mount Vue 3 app with reactive props
    const app = createApp(VueFrankenChat, state);
    app.mount(containerRef.current);
    vueAppRef.current = app;

    return () => {
      // 🧹 Clean unmount to strictly prevent memory leaks
      if (vueAppRef.current) {
        vueAppRef.current.unmount();
        vueAppRef.current = null;
        reactiveStateRef.current = null;
      }
    };
  }, []);

  // 🔄 Sync reactive props from React state to Vue 3 state instantly without remounting
  useEffect(() => {
    if (reactiveStateRef.current) {
      reactiveStateRef.current.roomId = props.roomId;
      reactiveStateRef.current.currentUserId = props.currentUserId;
      reactiveStateRef.current.currentUserName = props.currentUserName;
      reactiveStateRef.current.activeRoomName = props.activeRoomName;
      reactiveStateRef.current.activeRoomAvatar = props.activeRoomAvatar;
      reactiveStateRef.current.activeRoomRole = props.activeRoomRole;
      reactiveStateRef.current.messages = props.messages || [];
      reactiveStateRef.current.isPeerTyping = props.isPeerTyping || false;
      reactiveStateRef.current.peerTypingText = props.peerTypingText || '';
      reactiveStateRef.current.onSendMessage = props.onSendMessage;
      reactiveStateRef.current.onBack = props.onBack;
      reactiveStateRef.current.onSwitchEngine = props.onSwitchEngine;
    }
  }, [
    props.roomId,
    props.currentUserId,
    props.currentUserName,
    props.messages,
    props.isPeerTyping,
    props.peerTypingText,
    props.activeRoomName,
    props.activeRoomAvatar,
    props.activeRoomRole,
    props.onSendMessage,
    props.onBack,
    props.onSwitchEngine
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    />
  );
}
