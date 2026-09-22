<template>
  <CampusChatVue v-bind="$props" v-on="$attrs" />
</template>

<script setup lang="ts">
import CampusChatVue, { type ChatMessage } from './CampusChatVue.vue';

defineProps<{
  roomId?: string;
  currentUserId?: string;
  currentUserName?: string;
  activeRoomName?: string;
  activeRoomAvatar?: string;
  activeRoomRole?: string;
  messages?: ChatMessage[];
  isPeerTyping?: boolean;
  peerTypingText?: string;
  onSendMessage?: (text: string) => void;
  onBack?: () => void;
  onSwitchEngine?: () => void;
}>();
</script>
