<template>
  <div class="w-full h-screen max-h-screen flex flex-col md:flex-row bg-white dark:bg-gray-900 overflow-hidden font-sans pb-0 md:pb-0">
    <!-- 📋 SATU SIDEBAR DAFTAR KONTAK (Mobile: Fullscreen saat selectedChat null; Desktop: Kolom Kiri Ramping) -->
    <div
      :class="[
        'flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 shrink-0 h-full max-h-full overflow-hidden',
        selectedChat ? 'hidden md:flex md:w-72 lg:w-80 xl:w-92' : 'flex w-full flex-1 md:w-72 lg:w-80 xl:w-92'
      ]"
    >
      <!-- Header Sidebar -->
      <div class="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
        <div class="flex items-center gap-2">
          <button v-if="onBack" @click="handleBack" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 class="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>💬</span> Obrolan Kampus
          </h2>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            @click="handleSwitchEngine"
            class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 transition cursor-pointer flex items-center gap-1"
            title="Mode Vue 3 Aktif. Klik untuk beralih ke Mode React"
          >
            <span>⚡</span> Vue 3 Engine
          </button>
        </div>
      </div>

      <!-- Filter Role Chips -->
      <div class="px-2 sm:px-3 pt-2 pb-1 flex gap-1 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-800/60">
        <button
          v-for="f in roleFilters"
          :key="f.key"
          type="button"
          @click="activeRoleFilter = f.key"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer',
            activeRoleFilter === f.key
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          ]"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Search Contacts -->
      <div class="p-2 sm:p-3 border-b border-gray-100 dark:border-gray-800/60">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kontak / pesan..."
            class="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-text select-text"
            style="pointer-events: auto !important; user-select: text !important;"
          />
          <span class="absolute left-2.5 top-2.5 text-gray-400 text-xs pointer-events-none">🔍</span>
        </div>
      </div>

      <!-- Contact List Items -->
      <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="contact in displayedContacts"
          :key="contact.id"
          @click="selectContact(contact)"
          :class="[
            'p-3 sm:p-3.5 flex items-center gap-3 cursor-pointer transition-colors duration-150',
            selectedChat?.id === contact.id ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          ]"
        >
          <div class="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-xs">
            <img :src="contact.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + contact.name" class="w-full h-full object-cover" />
            <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900"></span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <span class="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{{ contact.name }}</span>
              <span class="text-[10px] text-gray-400 shrink-0">{{ contact.lastMessageTime || contact.time || '' }}</span>
            </div>
            <div class="flex items-center justify-between gap-1">
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                <span v-if="isContactTyping(contact.id) || isContactTyping(contact.partner_id) || isContactTyping(contact.partner_email) || (selectedChat?.id === contact.id && isPartnerTyping)" class="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse italic">
                  Sedang mengetik...
                </span>
                <span v-else>{{ contact.lastMessage || contact.last_message || 'Belum ada pesan' }}</span>
              </p>
              <span :class="['text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', getRoleBadge(contact.role).bgClass]">
                {{ getRoleBadge(contact.role).shortLabel }}
              </span>
            </div>
          </div>
          <!-- 🔴 UNREAD BADGE COUNTER -->
          <div v-if="getUnreadCount(contact.id) > 0" class="shrink-0">
            <span class="min-w-[20px] h-5 px-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
              {{ getUnreadCount(contact.id) > 99 ? '99+' : getUnreadCount(contact.id) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 👤 FOOTER IDENTITAS USER LOGIN AKTIF (KLIK UNTUK SWITCH PROFILE) -->
      <div 
        @click="showProfileModal = true"
        class="p-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition"
        title="Klik untuk ganti akun aktif"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 shrink-0 border border-emerald-500 relative">
            <img :src="currentUser.avatar" class="w-full h-full object-cover" />
            <span class="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
          </div>
          <div class="min-w-0">
            <div class="text-xs font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
              <span>{{ currentUser.name }}</span>
              <span class="text-[10px] text-gray-400 font-normal">(Ubah)</span>
            </div>
            <div class="text-[10px] text-gray-500 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {{ getRoleBadge(currentUser.role).label }}
            </div>
          </div>
        </div>
        <span :class="['text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0', getRoleBadge(currentUser.role).bgClass]">
          {{ getRoleBadge(currentUser.role).shortLabel }}
        </span>
      </div>
    </div>

    <!-- 💬 SATU RUANG PESAN AKTIF (Mobile: Tampil saat selectedChat; Desktop: Kolom Kanan Lega) -->
    <div
      :class="[
        'flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 h-full max-h-screen overflow-hidden min-w-0 transition-all duration-200',
        selectedChat ? 'flex w-full h-screen md:h-full' : 'hidden md:flex'
      ]"
    >
      <!-- Header Room -->
      <div class="shrink-0 h-14 px-3 sm:px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-xs z-10">
        <div class="flex items-center gap-2.5 min-w-0">
          <!-- Tombol Back Mobile -->
          <button
            type="button"
            @click="handleBackToContacts"
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 md:hidden cursor-pointer"
            title="Kembali ke Daftar Kontak"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>

          <div class="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <img :src="activePartnerAvatar" class="w-full h-full object-cover" />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900"></span>
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{{ activePartnerName }}</h3>
              <span :class="['text-[9px] font-bold px-1.5 py-0.5 rounded border', getRoleBadge(activePartnerRole).bgClass]">
                {{ getRoleBadge(activePartnerRole).shortLabel }}
              </span>
            </div>
            <!-- TYPING INDICATOR -->
            <p v-if="isPartnerTyping" class="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              <span class="text-emerald-500 animate-pulse font-semibold">{{ partnerTypingName || activePartnerName }} sedang mengetik...</span>
            </p>
            <p v-else class="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>Online • {{ getRoleBadge(activePartnerRole).label }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- 🤖 TOGGLE AI MODE (Hanya tampil untuk Penjual/Seller) -->
          <button
            v-if="currentUser.role === 'seller' || currentUser.role === 'superadmin'"
            type="button"
            @click="toggleAiMode"
            :class="[
              'text-[10px] font-bold px-2 py-1 rounded-full border transition cursor-pointer flex items-center gap-1',
              isAiMode
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            ]"
            :title="isAiMode ? 'Mode Auto-Pilot AI Aktif — klik untuk beralih ke Live Admin' : 'Mode Live Admin — klik untuk aktifkan AI Auto-Pilot'"
          >
            <span>{{ isAiMode ? '🤖' : '👤' }}</span>
            {{ isAiMode ? 'Auto-Pilot' : 'Live Admin' }}
          </button>
          <button
            type="button"
            @click="showProfileModal = true"
            class="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 cursor-pointer"
          >
            👤 {{ currentUser.name }}
          </button>
        </div>
      </div>

      <!-- 📜 DAFTAR BUBBLE PESAN CHAT -->
      <div ref="messagesContainerRef" class="flex-1 overflow-y-auto p-4 pb-16 min-h-0 space-y-2 bg-[#efeae2]/50 dark:bg-gray-950 relative">
        <!-- Backdrop transparan untuk menutup menu dropdown titik tiga saat klik di luar -->
        <div v-if="activeMenuMsgId !== null" @click="closeMessageMenu" class="fixed inset-0 z-30 bg-transparent"></div>

        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 py-12">
          <span class="text-4xl mb-2">💬</span>
          <p class="font-bold text-sm text-gray-700 dark:text-gray-300">Belum ada percakapan</p>
          <p class="text-xs text-gray-500">Ketik pesan di bawah untuk mulai mengobrol.</p>
        </div>

      <!-- 💬 BUBBLE CHAT DENGAN ATURAN POSISI PASTI -->
        <template v-for="(msg, idx) in messages" :key="getMsgKey(msg, idx)">
          <!-- 📢 PESAN SISTEM (STATUS PESANAN REALTIME) -->
          <div v-if="msg.senderRole === 'system' || msg.sender_role === 'system' || msg.senderId === 'system' || msg.sender_id === 'system'" class="flex w-full my-2.5 justify-center px-4">
            <div class="px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shadow-xs max-w-[90%] text-center">
              <span>📢</span>
              <span>{{ msg.text || msg.content }}</span>
              <span class="text-[9px] opacity-75 ml-1">{{ msg.time }}</span>
            </div>
          </div>

          <div 
            v-else
            :class="['flex w-full my-1.5 px-2 sm:px-3', isMine(msg) ? 'justify-end' : 'justify-start']"
          >
            <!-- Avatar hanya tampil jika BUKAN pesan sendiri (KIRI) -->
            <div v-if="!isMine(msg)" class="w-8 h-8 rounded-full mr-2 shrink-0 overflow-hidden shadow-xs mt-1">
              <img :src="activePartnerAvatar" class="w-full h-full object-cover" />
            </div>

            <!-- Bubble Box -->
            <div 
              :class="[
                'max-w-[85%] sm:max-w-[72%] p-3 pr-8 rounded-2xl text-sm break-words relative group',
                isMine(msg) 
                  ? 'ml-auto bg-[#10b981] text-white rounded-br-xs shadow-xs' 
                  : 'mr-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm rounded-bl-xs border border-gray-100 dark:border-gray-700',
                isMenuOpen(msg, idx) ? 'z-40' : 'z-10'
              ]"
            >
              <!-- ⋮ TOMBOL MENU AKSI PESAN (Tampil di kedua sisi: kanan/hijau & kiri/putih) -->
              <div v-if="!(msg.is_deleted || msg.isDeleted)" class="absolute top-1.5 right-1.5 z-40">
                <button
                  type="button"
                  @click.stop="toggleMessageMenu(msg, idx)"
                  :class="[
                    'w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer select-none',
                    isMenuOpen(msg, idx)
                      ? (isMyMessage(msg) ? 'bg-emerald-700 text-white shadow-xs opacity-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-xs opacity-100')
                      : (isMyMessage(msg) 
                          ? 'text-white/80 hover:text-white hover:bg-emerald-700/60 opacity-80 hover:opacity-100' 
                          : 'text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-80 hover:opacity-100')
                  ]"
                  title="Menu opsi pesan"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2.2"/>
                    <circle cx="12" cy="12" r="2.2"/>
                    <circle cx="12" cy="19" r="2.2"/>
                  </svg>
                </button>

                <!-- POPOVER / DROPDOWN MENU -->
                <div
                  v-if="isMenuOpen(msg, idx)"
                  @click.stop
                  :class="[
                    'absolute right-0 z-[60] min-w-[180px] w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-1.5 transition-all select-none text-gray-800 dark:text-gray-100',
                    idx >= Math.max(1, messages.length - 2) ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-1 origin-top-right'
                  ]"
                >
                  <!-- 🟢 MENU JIKA PESAN MILIK SENDIRI (KANAN/HIJAU): BALAS, EDIT, HAPUS -->
                  <div v-if="isMyMessage(msg)" class="py-0.5">
                    <!-- ↩️ Balas (Reply) -->
                    <button
                      type="button"
                      @click="startReplyMessage(msg); closeMessageMenu()"
                      class="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                    >
                      <span class="text-sm">↩️</span>
                      <span>Balas</span>
                    </button>

                    <!-- ✏️ Edit Pesan (Memicu inline editor / input edit teks) -->
                    <button
                      type="button"
                      @click="startEditMessage(msg); closeMessageMenu()"
                      class="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                    >
                      <span class="text-sm">✏️</span>
                      <span>Edit Pesan</span>
                    </button>

                    <!-- 🗑️ Hapus Pesan (Memicu event deleteMessage / tandai is_deleted) -->
                    <button
                      type="button"
                      @click="handleDeleteMessage(msg.id != null ? msg.id : msg.client_id); closeMessageMenu()"
                      class="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <span class="text-sm">🗑️</span>
                      <span>Hapus Pesan</span>
                    </button>
                  </div>

                  <!-- ⚪ MENU JIKA PESAN LAWAN BICARA (KIRI/PUTIH): CUKUP BALAS & TAMBAH REAKSI -->
                  <div v-else class="py-0.5">
                    <!-- Baris Reaksi Emoji Cepat -->
                    <div class="px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700/80">
                      <p class="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <span>😀</span> Tambah Reaksi Emoji
                      </p>
                      <div class="flex items-center justify-between gap-1">
                        <button
                          v-for="emo in ['❤️', '👍', '😂', '😮', '😢', '🙏']"
                          :key="emo"
                          type="button"
                          @click="handleReactToMessage(msg.id != null ? msg.id : msg.client_id, emo); closeMessageMenu()"
                          :class="[
                            'text-base p-1 rounded-lg transition-transform hover:scale-130 active:scale-95 cursor-pointer leading-none',
                            hasUserReacted(msg.reactions, emo) ? 'bg-emerald-100 dark:bg-emerald-950/70 ring-1 ring-emerald-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          ]"
                          :title="'Beri reaksi ' + emo"
                        >
                          {{ emo }}
                        </button>
                      </div>
                    </div>

                    <!-- ↩️ Balas (Reply) -->
                    <button
                      type="button"
                      @click="startReplyMessage(msg); closeMessageMenu()"
                      class="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
                    >
                      <span class="text-sm">↩️</span>
                      <span>Balas</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Nama Pengirim (Hanya untuk KIRI / Lawan Bicara) -->
              <div v-if="!isMyMessage(msg)" class="flex items-center gap-1.5 mb-1 pb-1 border-b border-gray-100 dark:border-gray-700/60 pr-5">
                <!-- Avatar AI berbeda -->
                <span v-if="isAiMessage(msg)" class="text-sm">🤖</span>
                <span class="font-bold text-xs" :class="isAiMessage(msg) ? 'text-violet-700 dark:text-violet-400' : 'text-gray-900 dark:text-gray-100'">
                  {{ msg.senderName || msg.sender_name || activePartnerName }}
                </span>
                <span :class="['text-[8.5px] font-bold px-1.5 py-0.2 rounded border', getRoleBadge(msg.senderRole || msg.sender_role || activePartnerRole).bgClass]">
                  {{ getRoleBadge(msg.senderRole || msg.sender_role || activePartnerRole).shortLabel }}
                </span>
              </div>

              <!-- ↩️ QUOTE PREVIEW PESAN YANG DIBALAS (Render sempurna di HP & Desktop) -->
              <div
                v-if="!(msg.is_deleted || msg.isDeleted) && (msg.replyTo || msg.reply_to)"
                :class="[
                  'mb-1.5 p-2 rounded-lg text-xs border-l-[3.5px] transition flex flex-col gap-0.5 select-none shadow-xs',
                  isMyMessage(msg)
                    ? 'bg-emerald-800/60 text-white border-emerald-300 shadow-inner'
                    : 'bg-emerald-50/90 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 border-emerald-600 dark:border-emerald-400'
                ]"
              >
                <div class="flex items-center gap-1 font-bold text-[11px]">
                  <span :class="isMyMessage(msg) ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-400'">↩️</span>
                  <span :class="isMyMessage(msg) ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-400'">
                    {{ msg.replyTo?.senderName || msg.replyTo?.sender_name || msg.reply_to?.senderName || msg.reply_to?.sender_name || 'Pengguna' }}
                  </span>
                </div>
                <p 
                  :class="[
                    'text-[11.5px] italic line-clamp-2 break-words',
                    isMyMessage(msg) ? 'text-emerald-100/90' : 'text-gray-600 dark:text-gray-300'
                  ]"
                >
                  {{ msg.replyTo?.text || msg.replyTo?.content || msg.reply_to?.text || msg.reply_to?.content || '...' }}
                </p>
              </div>

              <!-- ISI PESAN (NORMAL ATAU DIHAPUS) -->
              <p
                v-if="msg.is_deleted || msg.isDeleted"
                :class="[
                  'leading-relaxed italic flex items-center gap-1.5 text-xs select-none my-0.5',
                  isMyMessage(msg) ? 'text-emerald-100/80' : 'text-gray-400 dark:text-gray-500'
                ]"
              >
                <span>🚫</span>
                <span>Pesan ini telah dihapus untuk semua orang</span>
              </p>
              <div v-else-if="editingMessageId != null && (editingMessageId === msg.id || String(editingMessageId) === String(msg.id != null ? msg.id : (msg.client_id || msg._id)))" class="mt-1 flex flex-col gap-1.5 min-w-[200px]">
                <input
                  v-model="editingText"
                  @keydown.enter.prevent="submitEditMessage"
                  @keydown.esc.prevent="cancelEditMessage"
                  class="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 rounded-lg text-xs outline-none ring-2 ring-emerald-400 shadow-inner"
                  placeholder="Ketik teks baru..."
                  autoFocus
                />
                <div class="flex items-center justify-end gap-1.5 text-[11px]">
                  <button type="button" @click="cancelEditMessage" class="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 cursor-pointer">Batal</button>
                  <button type="button" @click="submitEditMessage" class="px-2 py-0.5 rounded bg-emerald-700 text-white hover:bg-emerald-800 font-bold cursor-pointer">Simpan</button>
                </div>
              </div>
              <p v-else class="leading-relaxed whitespace-pre-wrap">{{ msg.text || msg.content || msg.message }}</p>

              <!-- ❤️ 👍 TAMPILAN REAKSI EMOJI AKTIF (HANYA MUNCUL JIKA ADA PENGGUNA YANG MEMBERI REAKSI) -->
              <div v-if="getActiveReactions(msg.reactions).length > 0" class="flex flex-wrap gap-1 mt-1.5">
                <button
                  v-for="item in getActiveReactions(msg.reactions)"
                  :key="item.emoji"
                  type="button"
                  @click="handleReactToMessage(msg.id, item.emoji)"
                  :class="[
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer',
                    item.hasReacted
                      ? (isMyMessage(msg)
                          ? 'bg-emerald-800 text-white ring-1 ring-emerald-300 shadow-xs'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-400 shadow-xs')
                      : (isMyMessage(msg)
                          ? 'bg-black/20 text-emerald-100 hover:bg-black/30'
                          : 'bg-gray-100 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600')
                  ]"
                  :title="'Reaksi ' + item.emoji + ': ' + item.count + (item.hasReacted ? ' (Klik untuk membatalkan)' : '')"
                >
                  <span>{{ item.emoji }}</span>
                  <span class="text-[10px] font-bold">{{ item.count }}</span>
                </button>
              </div>

              <!-- FOOTER BUBBLE: STATUS DIEDIT, JAM & TANDA TERKIRIM (BERSIH DARI JEJERAN TOMBOL AKSI) -->
              <div :class="['text-[10px] flex items-center justify-end gap-1 shrink-0 mt-1 pt-0.5', isMyMessage(msg) ? 'text-emerald-100' : 'text-gray-400']">
                <span v-if="msg.is_edited || msg.isEdited" class="text-[9px] opacity-80 italic">(diedit)</span>
                <span>{{ formatTime(msg.created_at || msg.createdAt || msg.time) }}</span>
                <span v-if="isMyMessage(msg)" class="font-bold">✓✓</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 📣 TOAST NOTIFIKASI PESAN MASUK -->
      <transition name="toast-slide">
        <div
          v-if="toastMsg"
          class="absolute top-16 right-3 left-3 sm:left-auto sm:w-84 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-500/30 dark:border-emerald-500/20 p-3 flex items-center gap-3 z-[9999] cursor-pointer hover:scale-[1.02] transition-transform backdrop-blur-md"
          @click="toastMsg = null"
          role="alert"
        >
          <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-500/40 relative shadow-sm">
            <img :src="toastMsg.avatar || activePartnerAvatar" class="w-full h-full object-cover" />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between mb-0.5">
              <p class="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{{ toastMsg.senderName }}</p>
              <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">Baru 💬</span>
            </div>
            <p class="text-xs text-gray-600 dark:text-gray-300 truncate">{{ toastMsg.text }}</p>
          </div>
          <button
            type="button"
            @click.stop="toastMsg = null"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs shrink-0 p-1"
          >
            ✕
          </button>
        </div>
      </transition>
      <footer
        @touchstart.stop
        @touchend.stop
        @pointerdown.stop
        class="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 w-full shrink-0 relative z-20"
        style="isolation: isolate;"
      >
        <!-- 🪄 BARIS TOMBOL AI TOOLS & QUICK REPLY CHIPS (KHUSUS PENJUAL) -->
        <div 
          v-if="currentUser.role === 'seller' || currentUser.role === 'superadmin'" 
          class="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar py-0.5"
        >
          <button
            type="button"
            @click="showAiToolsDrawer = !showAiToolsDrawer"
            class="h-7 px-2.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition"
            :class="showAiToolsDrawer ? 'bg-violet-700 text-white' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'"
            title="Buka Alat Bantu AI Penjual"
          >
            <span>✨ AI Tools</span>
            <span class="text-[9px]">{{ showAiToolsDrawer ? '▲' : '▼' }}</span>
          </button>

          <!-- Quick Chips Template Balasan Cepat Langsung Kirim -->
          <button
            v-for="(chip, idx) in sellerQuickReplies"
            :key="idx"
            type="button"
            @click="handleSelectAITool(chip)"
            class="h-7 px-2.5 rounded-full text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 whitespace-nowrap shrink-0 transition cursor-pointer flex items-center"
            title="Klik untuk langsung kirim balasan AI ini"
          >
            {{ chip }}
          </button>
        </div>

        <!-- 🪄 DRAWER / POPOVER TEMPLATE BALASAN CERDAS AI -->
        <div
          v-if="showAiToolsDrawer && (currentUser.role === 'seller' || currentUser.role === 'superadmin')"
          class="mb-2 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 rounded-xl border border-violet-200 dark:border-violet-800 flex flex-col gap-2 shadow-sm animate-fade-in"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1">
              <span>✨ Template Balasan AI (Klik untuk langsung kirim ke Pembeli):</span>
            </span>
            <button
              type="button"
              @click="showAiToolsDrawer = false"
              class="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div class="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
            <button
              v-for="(item, idx) in aiTemplates"
              :key="idx"
              type="button"
              @click="() => { handleSelectAITool(item.text); showAiToolsDrawer = false; }"
              class="text-left p-2 rounded-lg bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-900 text-xs text-gray-800 dark:text-gray-100 hover:border-violet-400 dark:hover:border-violet-600 transition cursor-pointer shadow-xs"
            >
              <div class="font-bold text-violet-700 dark:text-violet-300 text-[11px] mb-0.5">{{ item.label }}</div>
              <div class="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">{{ item.text }}</div>
            </button>
          </div>
        </div>

        <!-- ↩️ BANNER MEMBALAS PESAN -->
        <div
          v-if="replyingToMessage"
          class="mb-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between text-xs animate-fade-in shadow-xs"
        >
          <div class="flex items-center gap-2 min-w-0 pr-2">
            <span class="text-base text-emerald-600 dark:text-emerald-400">↩️</span>
            <div class="min-w-0">
              <p class="font-bold text-[11px] text-emerald-800 dark:text-emerald-300 truncate">
                Membalas {{ replyingToMessage.sender_name || replyingToMessage.senderName || 'Pesan' }}
              </p>
              <p class="text-[11px] text-gray-600 dark:text-gray-400 truncate italic">
                {{ replyingToMessage.text || replyingToMessage.content }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="cancelReplyMessage"
            class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm p-1 cursor-pointer font-bold"
            title="Batal membalas"
          >
            ✕
          </button>
        </div>

        <!-- 🔒 BANNER RESTRIKSI OTORISASI MULTI-ROLE (JIKA TIDAK DIIZINKAN CHAT) -->
        <div v-if="!isChatAuthorized" class="px-3.5 py-2 mx-1 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2 shadow-xs">
          <span class="text-base">🔒</span>
          <span class="flex-1 text-[11px] leading-tight font-medium">{{ chatRestrictionMessage }}</span>
        </div>

        <!-- FORM SUBMIT EKSPLISIT SESUAI PERMINTAAN USER -->
        <form @submit.prevent="handleKirimPesan" class="flex items-center gap-2 m-0 p-0">
          <input
            id="chat_vue_input"
            ref="inputFieldRef"
            type="text"
            :value="pesanTeks"
            :disabled="!isChatAuthorized"
            @input="handleInputWithTyping"
            @keydown.enter.exact.prevent="handleKirimPesan"
            :placeholder="!isChatAuthorized ? 'Obrolan tidak aktif untuk status pesanan ini...' : 'Tulis pesan...'"
            autocomplete="off"
            class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 rounded-full text-base outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            style="font-size: 16px !important; pointer-events: auto !important;"
          />
          <button
            type="submit"
            :disabled="!isChatAuthorized"
            class="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            title="Kirim Pesan"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </footer>
    </div>

    <!-- 👤 MODAL SWITCH USER PROFILE (SIMULASI PERANGKAT) -->
    <div 
      v-if="showProfileModal" 
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      @click.self="showProfileModal = false"
    >
      <div class="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 class="font-bold text-base text-gray-900 dark:text-gray-100">Pilih Akun Perangkat</h3>
            <p class="text-xs text-gray-500">Ganti akun untuk simulasi percakapan multi-perangkat</p>
          </div>
          <button 
            type="button" 
            @click="showProfileModal = false" 
            class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-2">
          <button
            v-for="acc in PRESET_ACCOUNTS"
            :key="acc.id"
            type="button"
            @click="switchAccount(acc)"
            :class="[
              'w-full p-3 rounded-xl flex items-center justify-between border transition text-left cursor-pointer',
              currentUser.id === acc.id 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
            ]"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                <img :src="acc.avatar" class="w-full h-full object-cover" />
              </div>
              <div>
                <div class="font-bold text-sm text-gray-900 dark:text-gray-100">{{ acc.name }}</div>
                <div class="text-[11px] text-gray-500">{{ getRoleBadge(acc.role).label }}</div>
              </div>
            </div>
            <span v-if="currentUser.id === acc.id" class="text-emerald-600 font-bold text-xs">Aktif ✓</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { sendSocketMessage } from '../../lib/socket';
import {
  sendCloudChat,
  pushCloudChatMessage,
  subscribeToCloudChatStream,
  fetchCloudChats,
  normalizeUserId,
  syncCloudReaction,
  getDeterministicRoomId,
  syncCloudMessageUpdate,
  syncCloudMessageDelete,
  subscribeToSoketiRoom,
  broadcastSoketiAction,
  CLIENT_INSTANCE_ID
} from '../../lib/cloudChatSync';
import { broadcastMessageToSoketi, subscribeToGlobalChat, broadcastChatHttp, getEcho, getPusherClient } from '../../lib/echo';
import { requestBrowserNotificationPermission, showSystemWebNotification } from '../../lib/webNotification';
import { getRoomId as standardGetRoomId, isSelfUser } from '../../utils/chatUtils';
import { canChat, getChatRestrictionReason, UserRoleEnum, type ValidRole } from '../../types/auth';

interface CurrentUser {
  id: string;
  email?: string;
  name: string;
  role: 'buyer' | 'seller' | 'courier' | 'driver' | 'coop_admin' | 'superadmin' | 'super_admin';
  avatar?: string;
}

export interface ChatMessage {
  id?: string | number;
  room_id?: string;
  roomId?: string;
  sender_id?: string;
  senderId?: string;
  fromId?: string;
  sender_name?: string;
  senderName?: string;
  fromName?: string;
  sender_role?: string;
  senderRole?: string;
  receiver_id?: string;
  receiverId?: string;
  receiver_name?: string;
  receiverName?: string;
  receiver_role?: string;
  receiverRole?: string;
  text?: string;
  content?: string;
  time?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  is_self?: boolean;
  isSelf?: boolean;
  is_ai?: boolean;
  isAi?: boolean;
  is_edited?: boolean;
  isEdited?: boolean;
  is_deleted?: boolean;
  isDeleted?: boolean;
  reactions?: Record<string, string[] | number>;
  client_instance_id?: string;
  reply_to?: { id?: string | number; text?: string; content?: string; sender_name?: string; senderName?: string } | null;
  replyTo?: { id?: string | number; text?: string; content?: string; sender_name?: string; senderName?: string } | null;
}

// 🛡️ MODUL LEVEL SINGLETON LISTENER REFERENCES (Mencegah Double Listener Saat Remount/Re-render)
let activeUnsubStream: (() => void) | null = null;
let activePartnerTypingHandler: ((e: Event) => void) | null = null;
let activePartnerStopTypingHandler: ((e: Event) => void) | null = null;
let activeIncomingReactionHandler: ((e: Event) => void) | null = null;
let activeIncomingUpdatedHandler: ((e: Event) => void) | null = null;
let activeIncomingDeletedHandler: ((e: Event) => void) | null = null;
let activeReactionBc: BroadcastChannel | null = null;
let activePollInterval: any = null;
let activeSocketCleanup: (() => void) | null = null;
let activeSoketiUnsub: (() => void) | null = null;
let activeStorageHandler: ((e: StorageEvent) => void) | null = null;
let activeGlobalChatUnsub: (() => void) | null = null;
let activeOrderStatusHandler: ((e: Event) => void) | null = null;

// 🔔 Set untuk mencatat pesan yang sudah pernah membunyikan notifikasi (HANYA 1 KALI SEUMUR HIDUP)
const notifiedMsgIds = new Set<string>();

// Isi awal dengan pesan lama agar saat reload riwayat lama tidak dibunyikan
const markExistingAsNotified = (msgs: any[]) => {
  if (!msgs || !Array.isArray(msgs)) return;
  msgs.forEach(m => {
    if (m?.id) notifiedMsgIds.add(String(m.id));
  });
};

const props = defineProps<{
  roomId?: string;
  currentUserId?: string;
  currentUserName?: string;
  activeRoomName?: string;
  activeRoomAvatar?: string;
  activeRoomRole?: string;
  orderId?: string;
  orderStatus?: string;
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  onBack?: () => void;
  onSwitchEngine?: () => void;
}>();

const emit = defineEmits<{
  (e: 'send-message', text: string): void;
  (e: 'back'): void;
  (e: 'switch-engine'): void;
}>();

const handleSwitchEngine = () => {
  if (props.onSwitchEngine) {
    props.onSwitchEngine();
  }
  emit('switch-engine');
};

// 📡 Kanal BroadcastChannel Lokal Instan Antar-Tab/Window
const chatBroadcastChannel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('campusmart_chat_channel')
  : null;

// 1. DAFTAR AKUN SISTEM RESMI (FIXED ADMIN SUPPORT SYSTEM)
const FIXED_SUPPORT_ACCOUNTS: CurrentUser[] = [
  {
    id: 'coop_koperasi',
    email: 's1',
    name: 'Admin Koperasi',
    role: 'coop_admin',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi'
  },
  {
    id: 'admin_nurmiyaty',
    email: 'miyya@gmail.com',
    name: 'Nurmiyaty (Super Admin)',
    role: 'superadmin',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty'
  }
];
const PRESET_ACCOUNTS = FIXED_SUPPORT_ACCOUNTS;

// 2. DETEKSI IDENTITAS USER LOGIN AKTIF
const getActiveUser = (): CurrentUser => {
  try {
    const saved = typeof window !== 'undefined'
      ? (localStorage.getItem('campus_user') || localStorage.getItem('user') || localStorage.getItem('am_user_session'))
      : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      const rawRole = String(parsed.role || 'buyer').toLowerCase();
      let normRole: CurrentUser['role'] = 'buyer';
      if (rawRole.includes('seller') || rawRole.includes('penjual')) normRole = 'seller';
      else if (rawRole.includes('courier') || rawRole.includes('driver') || rawRole.includes('kurir')) normRole = 'courier';
      else if (rawRole.includes('koperasi') || rawRole.includes('coop')) normRole = 'coop_admin';
      else if (rawRole.includes('super') || (rawRole.includes('admin') && !rawRole.includes('koperasi'))) normRole = 'superadmin';

      const rawId = String(parsed.id || parsed.user_id || parsed.email || props.currentUserId || 'guest_user').trim();
      const normId = normalizeUserId(rawId);
      const normEmail = parsed.email || `${normId}@campusmart.ac.id`;
      const normName = String(parsed.name || parsed.nama || parsed.username || props.currentUserName || 'Pengguna Kampus');

      return {
        id: normId,
        email: normEmail,
        name: normName,
        role: normRole,
        avatar: parsed.avatar || (normRole === 'superadmin' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty' : normRole === 'coop_admin' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi' : `https://api.dicebear.com/7.x/identicon/svg?seed=${normId}`)
      };
    }
  } catch (e) {
    console.error('Error reading active user:', e);
  }

  const rawFallbackId = String(props.currentUserId || 'guest_user').trim();
  const fallbackNormId = normalizeUserId(rawFallbackId);
  const isSuper = fallbackNormId === 'admin_nurmiyaty' || (props.currentUserName?.toLowerCase().includes('admin') && !props.currentUserName?.toLowerCase().includes('koperasi'));
  const isCoop = fallbackNormId === 'coop_koperasi' || props.currentUserName?.toLowerCase().includes('koperasi');

  return {
    id: isSuper ? 'admin_nurmiyaty' : (isCoop ? 'coop_koperasi' : fallbackNormId),
    email: isSuper ? 'miyya@gmail.com' : (isCoop ? 's1' : `${fallbackNormId}@campusmart.ac.id`),
    name: props.currentUserName || (isSuper ? 'Nurmiyaty (Super Admin)' : (isCoop ? 'Admin Koperasi' : 'Pengguna Kampus')),
    role: isSuper ? 'superadmin' : (isCoop ? 'coop_admin' : 'buyer'),
    avatar: isSuper ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty' : (isCoop ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi' : `https://api.dicebear.com/7.x/identicon/svg?seed=${fallbackNormId}`)
  };
};

const currentUser = ref<CurrentUser>(getActiveUser());
const showProfileModal = ref(false);

// 3. ROLE BADGE HELPER
function getRoleBadge(role?: string) {
  const r = (role || 'buyer').toLowerCase();
  if (r === 'ai' || r === 'ai_agent' || r.includes('asisten')) {
    return {
      label: '🤖 Asisten AI',
      shortLabel: 'AI',
      bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    };
  }
  if (r === 'seller' || r === 'penjual') {
    return {
      label: '🏪 Penjual',
      shortLabel: 'Penjual',
      bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  if (r === 'courier' || r === 'driver' || r === 'kurir') {
    return {
      label: '🛵 Driver',
      shortLabel: 'Driver',
      bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    };
  }
  if (r === 'superadmin' || r === 'super_admin' || r === 'admin' || r === 'coop_admin' || r === 'koperasi') {
    return {
      label: '🛡️ Admin',
      shortLabel: 'Admin',
      bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  }
  return {
    label: '🛍️ Pembeli',
    shortLabel: 'Pembeli',
    bgClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };
}

// 🌟 Pengguna Kampus Standar (Pembeli, Penjual, Driver) agar di SEMUA browser/tab selalu tersedia kontak aktif
const DEFAULT_CAMPUS_USERS: any[] = [
  {
    id: 'raisa14@gmail.com',
    partner_id: 'raisa14@gmail.com',
    partner_email: 'raisa14@gmail.com',
    name: 'Raisa (Pembeli)',
    role: 'buyer',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa',
    lastMessage: 'Halo, apakah produk ini masih tersedia?',
    time: '10:30'
  },
  {
    id: 'seller_1',
    partner_id: 'seller_1',
    partner_email: 'seller_1@campusmart.ac.id',
    name: 'Myammiy Craft (Katalog Resmi)',
    role: 'seller',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=seller_1',
    lastMessage: 'Produk kerajinan kampus siap dipesan kak!',
    time: '08:45'
  },
  {
    id: 'driver_kampus',
    partner_id: 'driver_kampus',
    partner_email: 'driver@campusmart.ac.id',
    name: 'Driver Kampus',
    role: 'driver',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=driver',
    lastMessage: 'Siap antar pesanan ke gedung kuliah!',
    time: 'Kemarin'
  }
];

// 4. DAFTAR KONTAK BERDASARKAN USER AKTIF (ADMIN RESMI + USER DINAMIS)
const getContactsForUser = (user: CurrentUser) => {
  const list: any[] = [];
  const uId = String(user?.id || props.currentUserId || '').toLowerCase().trim();
  const uEmail = String(user?.email || '').toLowerCase().trim();
  const uName = String(user?.name || props.currentUserName || '').toLowerCase().trim();
  const uRole = String(user?.role || '').toLowerCase().trim();

  const isUserSuperAdmin = uRole.includes('super') || uId.includes('admin') || uId.includes('nurmiyaty') || uEmail.includes('miyya') || uName.includes('nurmiyaty');
  const isUserCoopAdmin = uRole.includes('coop') || uRole.includes('koperasi') || uId.includes('coop') || uId.includes('koperasi') || uEmail === 's1';

  // 1. Kontak Admin Resmi (Hanya tampilkan jika BUKAN akun yang sedang login)
  if (!isUserSuperAdmin) {
    list.push({
      id: 'admin_nurmiyaty',
      partner_id: 'admin_nurmiyaty',
      partner_email: 'miyya@gmail.com',
      name: 'Nurmiyaty (Super Admin)',
      role: 'superadmin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty',
      lastMessage: 'Halo! Ada yang bisa dibantu?',
      time: '12:10'
    });
  }

  if (!isUserCoopAdmin) {
    list.push({
      id: 'coop_koperasi',
      partner_id: 'coop_koperasi',
      partner_email: 's1',
      name: 'Admin Koperasi UIN Antasari',
      role: 'coop_admin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi',
      lastMessage: 'Voucher belanja kampus aktif!',
      time: '09:15'
    });
  }

  // 2. Kontak Pengguna Kampus Standar (Pembeli, Penjual, Driver)
  for (const defU of DEFAULT_CAMPUS_USERS) {
    if (!isSelfUser(defU, uId, uEmail, uName, uRole)) {
      list.push({ ...defU });
    }
  }

  // 3. Muat pengguna terdaftar secara dinamis dari localStorage ('am_registered_users')
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('am_registered_users');
      if (stored) {
        const users = JSON.parse(stored);
        if (Array.isArray(users)) {
          for (const u of users) {
            if (!u) continue;
            const regId = String(u.id || u.email || '').toLowerCase().trim();
            const regEmail = String(u.email || '').toLowerCase().trim();
            if (regId && !isSelfUser(u, uId, uEmail, uName, uRole)) {
              const existingIdx = list.findIndex(c => String(c.id).toLowerCase() === regId || String(c.partner_email || c.email).toLowerCase() === regEmail);
              if (existingIdx >= 0) {
                list[existingIdx] = {
                  ...list[existingIdx],
                  name: u.nama || u.name || list[existingIdx].name,
                  role: u.role || (u.roles && u.roles[0]) || list[existingIdx].role,
                  avatar: u.avatar || list[existingIdx].avatar
                };
              } else {
                list.push({
                  id: u.id || regId,
                  partner_id: u.id || regId,
                  partner_email: u.email || `${regId}@campusmart.ac.id`,
                  name: u.nama || u.name || 'Pengguna Kampus',
                  role: u.role || (u.roles && u.roles[0]) || 'buyer',
                  avatar: u.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${regId}`,
                  lastMessage: 'Halo! Siap bertransaksi',
                  time: 'Baru saja'
                });
              }
            }
          }
        }
      }
    } catch (_e) {}

    // 4. Periksa juga session lain ('campus_user', 'am_user_session', 'user', 'am_current_user')
    try {
      ['campus_user', 'am_user_session', 'user', 'am_current_user'].forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          const sess = JSON.parse(raw);
          const sId = String(sess.id || sess.email || '').toLowerCase().trim();
          const sEmail = String(sess.email || '').toLowerCase().trim();
          if (sId && !isSelfUser(sess, uId, uEmail, uName, uRole)) {
            const already = list.some(c => String(c.id).toLowerCase() === sId || String(c.partner_email || c.email).toLowerCase() === sEmail);
            if (!already) {
              list.push({
                id: sess.id || sId,
                partner_id: sess.id || sId,
                partner_email: sess.email || `${sId}@campusmart.ac.id`,
                name: sess.nama || sess.name || 'Pengguna Kampus',
                role: sess.role || (sess.roles && sess.roles[0]) || 'buyer',
                avatar: sess.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${sId}`,
                lastMessage: 'Halo! Siap bertransaksi',
                time: 'Baru saja'
              });
            }
          }
        }
      });
    } catch (_e) {}

    // 5. Muat partner dari semua histori obrolan yang tersimpan di localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('am_history_') || k.startsWith('am_chat_history_') || k.startsWith('am_local_chats_'))) {
          const rawH = localStorage.getItem(k);
          if (rawH) {
            const msgs = JSON.parse(rawH);
            if (Array.isArray(msgs)) {
              for (const m of msgs) {
                if (!m) continue;
                const sId = String(m.senderId || m.sender_id || '').toLowerCase().trim();
                const rId = String(m.receiverId || m.receiver_id || '').toLowerCase().trim();
                const partnerId = (sId && sId !== uId && !sId.includes(uId)) ? sId : ((rId && rId !== uId && !rId.includes(uId)) ? rId : '');
                if (partnerId) {
                  const partnerDummy = { id: partnerId, email: partnerId, name: m.senderName || m.receiverName };
                  if (!isSelfUser(partnerDummy, uId, uEmail, uName, uRole)) {
                    const already = list.some(c => String(c.id).toLowerCase() === partnerId || String(c.partner_id).toLowerCase() === partnerId);
                    if (!already) {
                      const isSender = partnerId === sId;
                      list.push({
                        id: partnerId,
                        partner_id: partnerId,
                        partner_email: `${partnerId}@campusmart.ac.id`,
                        name: (isSender ? (m.senderName || m.sender_name) : (m.receiverName || m.receiver_name)) || 'Pengguna Kampus',
                        role: (isSender ? (m.senderRole || m.sender_role) : (m.receiverRole || m.receiver_role)) || 'buyer',
                        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${partnerId}`,
                        lastMessage: m.text || m.content || m.message || 'Halo!',
                        time: m.time || 'Riwayat'
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (_e) {}
  }

  return list;
};

const contactsList = ref(getContactsForUser(currentUser.value));
// Alias ref untuk kompatibilitas & proteksi undefined
const contacts = contactsList;
const rawContacts = contactsList;

const deduplicateContactsList = () => {
  const map = new Map<string, any>();
  const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
  const myEmail = String(currentUser.value?.email || '').toLowerCase().trim();
  const myName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase().trim();
  const myRole = String(currentUser.value?.role || '').toLowerCase().trim();

  for (const c of contactsList.value) {
    if (!c || isSelfUser(c, myId, myEmail, myName, myRole)) continue;
    const normId = String(c.id || c.partner_id || '').toLowerCase().trim();
    if (!normId) continue;

    const unified = {
      ...c,
      id: normId,
      partner_id: normId,
      name: c.name || c.nama || 'Pengguna Kampus',
      role: c.role || 'buyer',
      avatar: c.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${normId}`
    };

    if (!map.has(normId)) {
      map.set(normId, unified);
    } else {
      const existing = map.get(normId);
      if (c.lastMessage && (!existing.lastMessage || (c.lastMessageTime && c.lastMessageTime >= existing.lastMessageTime))) {
        existing.lastMessage = c.lastMessage;
        existing.last_message = c.last_message || c.lastMessage;
        existing.lastMessageTime = c.lastMessageTime || c.time;
        existing.time = c.time || existing.time;
      }
    }
  }
  contactsList.value = Array.from(map.values());
};
deduplicateContactsList();
// 🧹 Pembersihan Cache Lama yang Tercemar/Tertukar (Reset State Bersih v11)
const purgeDirtyLegacyChatCache = () => {
  if (typeof window === 'undefined') return;
  try {
    const purgedFlag = 'am_chat_v11_clean';
    if (!localStorage.getItem(purgedFlag)) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (
          k.startsWith('am_history_') ||
          k.startsWith('am_chat_history_') ||
          k.startsWith('am_local_chats_') ||
          k.startsWith('am_chat_clean_') ||
          k.startsWith('am_last_sync_msg') ||
          k.includes('room_admin_') ||
          k.includes('room_seller_') ||
          k.includes('room_udin') ||
          k.includes('room_superadmin')
        )) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      localStorage.removeItem('am_target_chat_contact');
      localStorage.removeItem('am_target_chat_room');
      localStorage.removeItem('am_target_chat');
      localStorage.removeItem('am_last_sync_msg');
      localStorage.setItem(purgedFlag, 'true');
    }
  } catch (_e) {}
};
purgeDirtyLegacyChatCache();

const isContactSelf = (c: any): boolean => {
  if (!c) return false;
  const currentId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
  const currentEmail = String(currentUser.value?.email || '').toLowerCase().trim();
  const currentName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase().trim();
  const currentRole = String(currentUser.value?.role || '').toLowerCase().trim();
  return isSelfUser(c, currentId, currentEmail, currentName, currentRole);
};

const defaultPartner = computed(() => contactsList.value.find((c: any) => !isContactSelf(c)) || contactsList.value[0]);
const getInitialSelectedChat = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('am_target_chat_contact');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.id || parsed.partner_id || parsed.name) && !isContactSelf(parsed)) {
          const targetId = String(parsed.id || parsed.partner_id || '').toLowerCase().trim();
          const existing = contactsList.value.find((c: any) =>
            !isContactSelf(c) && (String(c.id).toLowerCase().trim() === targetId || String(c.partner_id).toLowerCase().trim() === targetId)
          );
          if (!existing) {
            contactsList.value.unshift(parsed);
            return parsed;
          }
          return existing;
        }
      }
    } catch (_e) {}
  }

  if (props.roomId) {
    const rId = String(props.roomId).toLowerCase().trim();
    const rName = props.activeRoomName || defaultPartner.value?.name || 'Kontak';
    const rRole = props.activeRoomRole || defaultPartner.value?.role || 'buyer';
    const rAvatar = props.activeRoomAvatar || defaultPartner.value?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${rId}`;

    const contactFromProps = {
      id: rId,
      partner_id: rId,
      partner_email: rId,
      name: rName,
      role: rRole,
      avatar: rAvatar
    };
    if (!isContactSelf(contactFromProps)) {
      const existing = contactsList.value.find((c: any) =>
        String(c.id).toLowerCase().trim() === rId ||
        String(c.partner_id).toLowerCase().trim() === rId ||
        (rName && c.name === rName)
      );
      if (!existing) {
        contactsList.value.unshift(contactFromProps);
        return contactFromProps;
      }
      return existing;
    }
  }

  return (typeof window !== 'undefined' && window.innerWidth >= 768)
    ? defaultPartner.value
    : null;
};

// 5. Selected Chat State
const selectedChat = ref<any>(getInitialSelectedChat());

watch(
  () => props.roomId,
  (newRoomId) => {
    if (newRoomId) {
      const targetId = String(newRoomId).toLowerCase().trim();
      const targetName = props.activeRoomName || '';
      const targetRole = props.activeRoomRole || 'buyer';
      const targetAvatar = props.activeRoomAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${targetId}`;

      const match = contactsList.value.find(
        (c: any) =>
          String(c.id).toLowerCase().trim() === targetId ||
          String(c.partner_id).toLowerCase().trim() === targetId ||
          (targetName && c.name === targetName)
      );
      if (match) {
        selectContact(match);
      } else {
        const newContact = {
          id: targetId,
          partner_id: targetId,
          partner_email: targetId,
          name: targetName || 'Kontak Kampus',
          role: targetRole,
          avatar: targetAvatar,
          lastMessage: '',
          lastMessageTime: 'Baru saja'
        };
        contactsList.value.unshift(newContact);
        selectContact(newContact);
      }
    }
  }
);

const switchAccount = (acc: CurrentUser) => {
  currentUser.value = acc;
  if (typeof window !== 'undefined') {
    localStorage.setItem('campus_user', JSON.stringify(acc));
    localStorage.setItem('user', JSON.stringify(acc));
    localStorage.setItem('am_user_session', JSON.stringify(acc));
  }
  rawMessagesMap.clear();
  messages.value = [];
  contactsList.value = getContactsForUser(acc);
  selectedChat.value = contactsList.value[0];
  showProfileModal.value = false;
  initContactsFromLocalHistory();
  loadChatHistory();
  setupSoketiRoomSubscription();
  scrollToBottom();
};

// 6. State Input & Pesan (Uncontrolled Native — Zero Reactive Binding on Input)
const nativeInputRef = ref<HTMLInputElement | null>(null);
// Alias compat refs (digunakan oleh touch listener & legacy code)
const inputFieldRef = nativeInputRef;
const chatInputRef = nativeInputRef;
// pesanTeks hanya digunakan internal logic; input field TIDAK terikat ke state ini
const pesanTeks = ref('');
const inputText = pesanTeks;
const inputMessage = pesanTeks;
const searchQuery = ref('');
const activeRoleFilter = ref('all');
const messagesContainerRef = ref<HTMLDivElement | null>(null);

// 🛡️ SINGLETON MAP UNTUK MENAMPUNG PESAN BEBAS DUPLIKASI
const rawMessagesMap = new Map<string, any>();
const messages = ref<ChatMessage[]>([]);

const syncMessagesFromMap = () => {
  messages.value = Array.from(rawMessagesMap.values()).sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || a.time || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || b.time || 0).getTime();
    return timeA - timeB;
  });
};

// 7. State Fitur Real-Time
const isPartnerTyping = ref(false);
const partnerTypingName = ref('');
const typingContacts = ref<Record<string, boolean>>({});
const isContactTyping = (contactId: string | number) => Boolean(typingContacts.value[String(contactId)]);
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let partnerTypingTimeout: ReturnType<typeof setTimeout> | null = null;

// 💬 State Menu Aksi Pesan Titik Tiga (⋮)
const activeMenuMsgId = ref<string | null>(null);
const getMsgKey = (msg: any, idx?: number): string => {
  if (msg?.id != null && String(msg.id).trim() !== '') return String(msg.id);
  if (msg?.client_id != null) return String(msg.client_id);
  if (msg?._id != null) return String(msg._id);
  if (msg?.time != null) return String(msg.time);
  return `msg_${idx ?? 0}`;
};
const isMenuOpen = (msg: any, idx?: number): boolean => {
  if (!activeMenuMsgId.value) return false;
  return activeMenuMsgId.value === getMsgKey(msg, idx);
};
const toggleMessageMenu = (msg: any, idx?: number) => {
  const key = getMsgKey(msg, idx);
  if (activeMenuMsgId.value === key) {
    activeMenuMsgId.value = null;
  } else {
    activeMenuMsgId.value = key;
  }
};
const closeMessageMenu = () => {
  activeMenuMsgId.value = null;
};

// State Edit Pesan
const editingMessageId = ref<string | number | null>(null);
const editingText = ref('');

// State Reply / Balas Pesan
const replyingToMessage = ref<ChatMessage | null>(null);
const startReplyMessage = (msg: ChatMessage) => {
  replyingToMessage.value = msg;
  nextTick(() => {
    if (inputFieldRef.value) {
      inputFieldRef.value.focus();
    }
  });
};
const cancelReplyMessage = () => {
  replyingToMessage.value = null;
};

// Unread badge: Map<contactId, count>
const unreadCounts = ref<Record<string, number>>({});
const getUnreadCount = (contactId: string | number): number => {
  return unreadCounts.value[String(contactId)] || 0;
};
const incrementUnread = (contactId: string) => {
  unreadCounts.value = {
    ...unreadCounts.value,
    [contactId]: (unreadCounts.value[contactId] || 0) + 1
  };
};
const clearUnread = (contactId: string) => {
  if (unreadCounts.value[contactId]) {
    const next = { ...unreadCounts.value };
    delete next[contactId];
    unreadCounts.value = next;
  }
};

// Toast notifikasi
// Toast notifikasi
const toastMsg = ref<{ senderName: string; text: string; avatar?: string } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const showToast = (msg: { senderName: string; text: string; avatar?: string }) => {
  toastMsg.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = null; }, 4500);
};

// 🔔 REAL-TIME AUDIO SYNTHESIZER (Web Audio API Bell Chime - 100% Mandiri Tanpa File Eksternal)
let audioCtxInstance: AudioContext | null = null;
const initAudioContext = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxInstance || audioCtxInstance.state === 'closed') {
      audioCtxInstance = new AudioCtx();
    }
    if (audioCtxInstance.state === 'suspended') {
      audioCtxInstance.resume().catch(() => {});
    }
  } catch (_e) {}
};

// Pasang listener global untuk unlock Web Audio saat ada interaksi pertama di halaman
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

const playNotifSound = () => {
  try {
    initAudioContext();
    if (!audioCtxInstance) return;
    if (audioCtxInstance.state === 'suspended') {
      audioCtxInstance.resume().catch(() => {});
    }

    const now = audioCtxInstance.currentTime;
    // Bell Tone 1: 880Hz (A5)
    const osc1 = audioCtxInstance.createOscillator();
    const gain1 = audioCtxInstance.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtxInstance.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Bell Tone 2: 1320Hz (E6) Harmonik Tinggi Manis
    const osc2 = audioCtxInstance.createOscillator();
    const gain2 = audioCtxInstance.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.1);
    gain2.gain.setValueAtTime(0.35, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtxInstance.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch (_e) {}
};

/**
 * 🔔 Trigger Notifikasi Toast & Bunyi Bell dengan Proteksi Anti-Loop:
 * 1. Setiap pesan HANYA PERNAH memicu notifikasi 1 kali seumur hidup (via notifiedMsgIds Set).
 * 2. Tidak memunculkan toast popup banner jika obrolan dengan kontak pengirim sedang dibuka aktif.
 * 3. Tidak membunyikan pesan diri sendiri.
 */
const triggerNotificationBeepAndToast = (incomingMsg: any) => {
  if (!incomingMsg) return;
  const msgId = String(incomingMsg.id || '');
  if (!msgId) return;

  // 1. Cek apakah pesan sudah pernah dibunyikan (hanya 1x seumur hidup)
  if (notifiedMsgIds.has(msgId)) return;
  notifiedMsgIds.add(msgId);

  // 2. Jangan bunyikan pesan dari diri sendiri
  if (isSelf(incomingMsg)) return;

  const senderNorm = normalizeUserId(incomingMsg.senderId || (incomingMsg as any).sender_id || '');
  const activeContactId = String(selectedChat.value?.id || '');
  const senderContact = contactsList.value.find(c =>
    normalizeUserId(String(c.id)) === senderNorm ||
    normalizeUserId(c.name || '') === senderNorm ||
    normalizeUserId(c.partner_id || '') === senderNorm ||
    (c as any).partner_email === senderNorm
  );
  const senderContactId = senderContact?.id;

  // 3. Cek apakah obrolan dengan pengirim ini sedang aktif dibuka
  const currentPartnerNorm = normalizeUserId(String(
    (activeRoom.value as any)?.otherId ||
    (selectedChat.value as any)?.partner_email ||
    selectedChat.value?.partner_id ||
    selectedChat.value?.id ||
    ''
  ));
  const currentPartnerNameNorm = String(activePartnerName.value || '').toLowerCase().trim();
  const incomingSenderName = String(incomingMsg.senderName || (incomingMsg as any).sender_name || senderContact?.name || '').toLowerCase().trim();

  const isCurrentlyInRoomWithSender = Boolean(
    selectedChat.value &&
    (
      (currentPartnerNorm && senderNorm && (currentPartnerNorm === senderNorm || currentPartnerNorm.includes(senderNorm) || senderNorm.includes(currentPartnerNorm))) ||
      (currentPartnerNameNorm && incomingSenderName && (currentPartnerNameNorm.includes(incomingSenderName) || incomingSenderName.includes(currentPartnerNameNorm))) ||
      (senderContactId && String(senderContactId) === activeContactId) ||
      normalizeUserId(String(selectedChat.value.id)) === senderNorm ||
      normalizeUserId(String(selectedChat.value.partner_id)) === senderNorm ||
      normalizeUserId(String((selectedChat.value as any).partner_email)) === senderNorm
    )
  );

  // Jika obrolan sedang aktif dibuka di depan mata (layar fokus), jangan ganggu dengan bell maupun toast
  if (isCurrentlyInRoomWithSender && (typeof document === 'undefined' || !document.hidden)) {
    return;
  }

  // Tambah counter unread HANYA jika kontak pengirim sedang TIDAK dibuka aktif
  if (senderContactId && !isCurrentlyInRoomWithSender) {
    incrementUnread(String(senderContactId));
  }

  // Tampilkan toast banner HANYA jika obrolan dengan kontak pengirim sedang TIDAK dibuka aktif
  if (!isCurrentlyInRoomWithSender) {
    showToast({
      senderName: incomingMsg.senderName || senderContact?.name || activePartnerName.value || 'Pesan Masuk',
      text: incomingMsg.text || incomingMsg.content || '',
      avatar: incomingMsg.senderAvatar || senderContact?.avatar || activePartnerAvatar.value
    });
  }

  // Bunyikan suara bell (hanya saat obrolan tidak sedang dibuka di layar aktif atau tab di-minimize)
  playNotifSound();

  // Web Notification sistem jika tab background
  try {
    if (document.hidden || !isCurrentlyInRoomWithSender) {
      showSystemWebNotification(`Pesan dari ${incomingMsg.senderName || senderContact?.name || 'Obrolan Kampus'}`, {
        body: incomingMsg.text || incomingMsg.content || '',
        icon: incomingMsg.senderAvatar || senderContact?.avatar || activePartnerAvatar.value,
        tag: `chat_${incomingMsg.roomId || incomingMsg.id || 'room'}`
      });
    }
  } catch (_e) {}
};

const roleFilters = [
  { key: 'all', label: 'Semua' },
  { key: 'seller', label: '🏪 Penjual' },
  { key: 'driver', label: '🛵 Driver' },
  { key: 'buyer', label: '🛍️ Pembeli' },
  { key: 'admin', label: '🛡️ Admin' }
];

// ==========================================
// 🤖 AI MODE STATE & LOGIC
// ==========================================
const _getInitialAiMode = (): boolean => {
  try { return localStorage.getItem('am_ai_mode') === 'true'; } catch { return false; }
};
const isAiMode = ref<boolean>(_getInitialAiMode());

const isAiMessage = (msg: any): boolean => {
  const role = String(msg?.sender_role || msg?.senderRole || '').toLowerCase();
  if (role === 'ai') return true;
  if (msg?.is_ai === true || msg?.isAi === true) return true;
  const name = String(msg?.sender_name || msg?.senderName || '').toLowerCase();
  return name.includes('asisten ai') || name.includes('bot') || name.includes('asisten');
};

const toggleAiMode = () => {
  isAiMode.value = !isAiMode.value;
  try { localStorage.setItem('am_ai_mode', String(isAiMode.value)); } catch (_e) {}
};

// Bank respons AI sederhana (lokal fallback tanpa API call)
const AI_REPLIES: Record<string, string> = {
  default: 'Halo! Terima kasih sudah menghubungi toko kami 🙏 Ada yang bisa kami bantu?',
  stok: 'Stok saat ini tersedia untuk sebagian besar produk. Silakan tanyakan item spesifik ya Kak! 📦',
  harga: 'Untuk harga terbaru silakan cek katalog di menu Produk, atau tanyakan langsung nama produknya 😊',
  pengiriman: 'Kami melayani pengiriman ke seluruh area kampus UIN Antasari. Estimasi 30-60 menit ya! 🛵',
  promo: 'Ada promo hari ini! Diskon 10% untuk pembelian di atas Rp50.000 🎉',
  terima: 'Sama-sama Kak! Jangan sungkan tanya lagi ya 🙏',
};

const getAiReply = (userText: string): string => {
  const lower = userText.toLowerCase();
  if (lower.includes('stok') || lower.includes('ada')) return AI_REPLIES.stok;
  if (lower.includes('harga') || lower.includes('berapa') || lower.includes('biaya')) return AI_REPLIES.harga;
  if (lower.includes('kirim') || lower.includes('antar') || lower.includes('ongkir')) return AI_REPLIES.pengiriman;
  if (lower.includes('promo') || lower.includes('diskon') || lower.includes('voucher')) return AI_REPLIES.promo;
  if (lower.includes('makasih') || lower.includes('terima kasih') || lower.includes('thx')) return AI_REPLIES.terima;
  return AI_REPLIES.default;
};

let aiAutoReplyTimer: ReturnType<typeof setTimeout> | null = null;

// State Drawer AI Tools
const showAiToolsDrawer = ref(false);

// Template balasan cepat penjual (Chips)
const sellerQuickReplies = [
  'Halo Kak! 🌸 Selamat datang di toko kami. Produk kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan hari ini? 😊✨',
  'Stoknya masih ready banget Kak! Siap dipesan dan bisa langsung diambil di Vending Machine kampus atau COD yaa! 🌸🥰',
  'Harganya spesial dan masih promo lho! Sudah dapat produk original dan siap pakai! 🎁✨',
  'Bisa banget COD di Kampus 1 & Kampus 2 UIN Antasari Banjarmasin kak! 🛵✨',
  'Terima kasih banyak sudah berbelanja di toko kami! 🙏✨'
];

// Template AI terstruktur untuk Drawer AI Tools
const aiTemplates = [
  {
    label: '🌸 Sambutan Selamat Datang (Resmi)',
    text: 'Halo Kak! 🌸 Selamat datang di toko kami. Produk kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan hari ini? 😊✨'
  },
  {
    label: '📦 Info Stok Ready & Vending Machine',
    text: 'Stoknya masih ready banget Kak! Siap dipesan dan bisa langsung diambil di Vending Machine kampus atau COD yaa! 🌸🥰'
  },
  {
    label: '🎁 Info Harga Promo Diskon',
    text: 'Harganya spesial dan masih promo lho! Sudah dapat produk original dan siap pakai! 🎁✨'
  },
  {
    label: '🛵 Info COD Kampus Antasari',
    text: 'Bisa banget COD di Kampus 1 & Kampus 2 UIN Antasari Banjarmasin kak! Mau ketemuan di fakultas / lobi mana hari ini? 🛵✨'
  },
  {
    label: '🙏 Ucapan Terima Kasih & Closing',
    text: 'Terima kasih banyak sudah berbelanja di toko kami! Jangan sungkan untuk menghubungi kami lagi yaa 🙏✨'
  }
];

// 🎯 STANDARISASI KONSISTENSI ID PENGGUNA UNTUK CHANNEL ROOM
const getNormalizedId = (user: any): string => {
  if (!user) return '';
  const raw = (typeof user === 'object')
    ? (user.id || user.partner_id || user.email || user.partner_email || user.partnerEmail || user.user_id || user.name || '')
    : String(user);
  return normalizeUserId(raw);
};

// 🚀 STANDARISASI ROOM ID DENGAN SORTING (DETERMINISTIC ROOM ID)
const getRoomId = (userIdA: string, userIdB: string, orderId?: string): string => {
  return standardGetRoomId(userIdA, userIdB, orderId || props.orderId);
};

// 🚀 SINKRONISASI ROOM AKTIF DETERMINISTIK (KUNCI SYNC UNIVERSAL)
const currentDeterministicRoomId = computed(() => {
  const normCurrent = getNormalizedId(currentUser.value) || String(currentUser.value?.id || 'guest');
  const activePartner = selectedChat.value || defaultPartner.value;
  const normPartner = getNormalizedId(activePartner) || (normCurrent === 'admin_nurmiyaty' ? 'coop_koperasi' : 'admin_nurmiyaty');
  return getRoomId(normCurrent, normPartner);
});

const activeRoom = computed(() => {
  const detRoomId = currentDeterministicRoomId.value;
  const partner = selectedChat.value || defaultPartner.value;
  const normCurrent = getNormalizedId(currentUser.value);
  const otherId = getNormalizedId(partner) || (normCurrent === 'admin_nurmiyaty' ? 'coop_koperasi' : 'admin_nurmiyaty');
  return {
    id: detRoomId,
    room_id: detRoomId,
    roomId: detRoomId,
    otherId,
    otherName: activePartnerName.value,
    otherRole: activePartnerRole.value,
    otherAvatar: activePartnerAvatar.value
  };
});

const activeRoomId = computed(() => {
  return activeRoom.value?.id || currentDeterministicRoomId.value || 'room_default';
});

// 🚀 HANDLER KETIKA USER MENGIRIM BALASAN AI / TEMPLATE
const sendAIMessageFromSeller = async (aiContent: string) => {
  if (!aiContent || !aiContent.trim()) return;

  const currentRoom = activeRoom.value?.id || currentDeterministicRoomId.value || 'room_default';
  const mySenderId = currentUser.value?.id || 'seller_user';
  const mySenderName = currentUser.value?.name || 'Penjual';
  const partner = selectedChat.value || defaultPartner.value;
  const partnerId = partner?.id || 'admin_nurmiyaty';
  const partnerName = activePartnerName.value || partner?.name || 'Lawan Bicara';
  const partnerRole = activePartnerRole.value || partner?.role || 'buyer';

  const aiPayload = {
    id: 'msg_ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    room_id: currentRoom,
    roomId: currentRoom,
    sender_id: mySenderId,
    senderId: mySenderId,
    sender_name: mySenderName,
    senderName: mySenderName,
    sender_role: currentUser.value?.role || 'seller',
    senderRole: currentUser.value?.role || 'seller',
    is_ai: true,
    isAi: true,
    receiver_id: String(partnerId),
    receiverId: String(partnerId),
    receiver_name: partnerName,
    receiverName: partnerName,
    receiver_role: partnerRole,
    receiverRole: partnerRole,
    text: aiContent.trim(),
    content: aiContent.trim(),
    is_self: true,
    isSelf: true,
    is_me: true,
    time: formatTime(new Date().toISOString()),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // 1. Tampilkan di layar dengan deduplikasi aman
  appendMessageSafe(aiPayload);

  // 2. Siarkan ke Upstash Redis Cloud Sync (SafeChatSyncHub otomatis siarkan ke perangkat lain)
  if (typeof pushCloudChatMessage === 'function') {
    try {
      await pushCloudChatMessage(aiPayload as any);
      console.log('✅ [AI Tools] Pesan AI berhasil dikirim ke Cloud Sync via pushCloudChatMessage');
    } catch (e) {
      console.error('[AI Sync Error]', e);
    }
  } else {
    try {
      await sendCloudChat({
        id: aiPayload.id,
        fromId: sellerId,
        fromName: sellerName,
        fromRole: 'seller',
        fromAvatar: currentUser.value.avatar,
        toId: String(partnerId),
        toName: partnerName,
        toRole: partnerRole,
        toAvatar: activePartnerAvatar.value,
        text: aiContent.trim()
      });
      console.log('✅ [AI Tools] Pesan AI dikirim via sendCloudChat');
    } catch (err) {
      console.error('[AI Sync Error sendCloudChat]', err);
    }
  }

  // 3. Siarkan ke WebSocket jika terhubung
  try {
    if (typeof (window as any).socket !== 'undefined' && (window as any).socket?.emit) {
      (window as any).socket.emit('chat_message', aiPayload);
    }
    sendSocketMessage({
      roomId: String(activeRoomId),
      senderId: sellerId,
      senderName: sellerName,
      senderRole: 'seller',
      receiverId: String(partnerId),
      receiverName: partnerName,
      text: aiContent.trim(),
      time: aiPayload.time,
      createdAt: aiPayload.created_at
    } as any);
  } catch (_e) {}
};

// 🎯 FUNGSI KETIKA TOMBOL SARAN / AI TOOLS DIKLIK
const handleSelectAITool = (templateText: string) => {
  if (!templateText) return;
  sendAIMessageFromSeller(templateText);
};

// Alias untuk kompatibilitas
const handleSendAIMessage = (templateText: string) => {
  sendAIMessageFromSeller(templateText);
};

// Fungsi broadcast balasan AI ke seluruh channel
const broadcastAiReply = (replyText: string, _toContactId?: string, _toName?: string, _toRole?: string, _toAvatar?: string) => {
  sendAIMessageFromSeller(replyText);
};

const filteredContacts = computed(() => {
  let list = contactsList.value;
  if (activeRoleFilter.value !== 'all') {
    list = list.filter(c => {
      const r = String(c.role || '').toLowerCase();
      if (activeRoleFilter.value === 'admin') {
        return r === 'superadmin' || r === 'super_admin' || r === 'admin' || r === 'coop_admin';
      }
      if (activeRoleFilter.value === 'driver') {
        return r === 'driver' || r === 'courier' || r === 'kurir';
      }
      if (activeRoleFilter.value === 'buyer') {
        return r === 'buyer' || r === 'pembeli' || r === 'user';
      }
      if (activeRoleFilter.value === 'seller') {
        return r === 'seller' || r === 'penjual';
      }
      return r === activeRoleFilter.value;
    });
  }
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(c => c.name.toLowerCase().includes(q) || (c.lastMessage || c.last_message || '').toLowerCase().includes(q));
});

// 🎯 DEDUPLIKASI & NORMALISASI KONTAK DINAMIS MURNI DENGAN ISOLASI DIRI SENDIRI SECARA KETAT
const deduplicatedContacts = computed(() => {
  const contactMap = new Map<string, any>();

  const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
  const myEmail = String(currentUser.value?.email || '').toLowerCase().trim();
  const myName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase().trim();
  const myRole = String(currentUser.value?.role || '').toLowerCase().trim();

  // Filter ketat: jika id kontak sama persis atau mengandung ID akun login saya, buang!
  const filtered = rawContacts.value.filter(c => {
    if (!c || !c.id) return false;
    const contactId = String(c.id || c.partner_id || '').toLowerCase().trim();
    if (contactId === myId) return false;
    if (myId.includes('admin') && contactId.includes('admin_nurmiyaty')) return false;
    if (isSelfUser(c, myId, myEmail, myName, myRole)) return false;
    return true;
  });

  for (const user of filtered) {
    if (!user || !user.id) continue;
    const normalizedId = String(user.id).toLowerCase().trim();

    // Aturan 2: Pertahankan Admin Koperasi & Super Admin jika ada
    // Aturan 3: Setiap user unik (siapapun nama barunya) hanya muncul 1 kali
    if (!contactMap.has(normalizedId)) {
      contactMap.set(normalizedId, {
        ...user,
        id: normalizedId,
        partner_id: normalizedId,
        name: user.name || user.nama || 'Pengguna Kampus',
        role: user.role || 'buyer', // default role jika tidak ada
        avatar: user.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${normalizedId}`
      });
    } else {
      const existing = contactMap.get(normalizedId);
      if (user.lastMessage && (!existing.lastMessage || (user.lastMessageTime && user.lastMessageTime >= existing.lastMessageTime))) {
        existing.lastMessage = user.lastMessage;
        existing.last_message = user.last_message || user.lastMessage;
        existing.lastMessageTime = user.lastMessageTime || user.time;
        existing.time = user.time || existing.time;
      }
    }
  }

  return Array.from(contactMap.values());
});

const displayedContacts = computed(() => {
  let list = deduplicatedContacts.value;
  if (activeRoleFilter.value !== 'all') {
    list = list.filter(c => {
      const r = String(c.role || '').toLowerCase();
      if (activeRoleFilter.value === 'admin') {
        return r === 'superadmin' || r === 'super_admin' || r === 'admin' || r === 'coop_admin';
      }
      if (activeRoleFilter.value === 'driver') {
        return r === 'driver' || r === 'courier' || r === 'kurir';
      }
      if (activeRoleFilter.value === 'buyer') {
        return r === 'buyer' || r === 'pembeli' || r === 'user';
      }
      if (activeRoleFilter.value === 'seller') {
        return r === 'seller' || r === 'penjual';
      }
      return r === activeRoleFilter.value;
    });
  }
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.lastMessage || c.last_message || '').toLowerCase().includes(q));
});

function selectContact(c: any) {
  const target = { ...c };
  selectedChat.value = target;
  rawMessagesMap.clear();
  messages.value = [];
  // Hapus badge unread saat kontak dibuka
  if (target?.id != null) clearUnread(String(target.id));
  // Reset typing indicator
  isPartnerTyping.value = false;
  if (partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
  loadChatHistory();
  setupSoketiRoomSubscription();
  setupEchoChatListeners();
  scrollToBottom();
}

function handleBackToContacts() {
  selectedChat.value = null;
  if (props.onBack) {
    props.onBack();
  }
  emit('back');
}

function handleBack() {
  handleBackToContacts();
}

const activePartnerName = computed(() => {
  return props.activeRoomName || selectedChat.value?.name || 'Lawan Bicara';
});

const activePartnerAvatar = computed(() => {
  return props.activeRoomAvatar || selectedChat.value?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + activePartnerName.value;
});

const activePartnerRole = computed(() => {
  if (selectedChat.value) {
    const sId = String(selectedChat.value.id || selectedChat.value.partner_id || '').toLowerCase();
    const sName = String(selectedChat.value.name || '').toLowerCase();
    const sRole = String(selectedChat.value.role || '').toLowerCase();
    if (sId.includes('admin') || sName.includes('admin') || sRole.includes('admin') || sId.includes('nurmiyaty') || sName.includes('nurmiyaty')) {
      return 'super_admin';
    }
    return selectedChat.value.role || props.activeRoomRole || 'seller';
  }
  const propRole = String(props.activeRoomRole || '').toLowerCase();
  const propName = String(props.activeRoomName || '').toLowerCase();
  if (propRole.includes('admin') || propName.includes('admin') || propName.includes('nurmiyaty')) {
    return 'super_admin';
  }
  return props.activeRoomRole || 'seller';
});

// ==========================================
// 🎯 ATURAN POSISI BUBBLE CHAT (KANAN vs KIRI)
// ==========================================
// 🎯 ATURAN POSISI BUBBLE CHAT MURNI (PURE BUBBLE POSITION)
// Formula: const isMine = (msg) => String(msg.sender_id || msg.senderId).toLowerCase() === String(currentUser.id).toLowerCase();
// ==========================================
const isMine = (msg: any): boolean => {
  if (!msg) return false;
  const currentId = String(currentUser.value?.id ?? (currentUser as any)?.id ?? props.currentUserId ?? '').toLowerCase().trim();
  const senderId = String(msg.sender_id || msg.senderId || (msg as any).sender || (msg as any).fromId || '').toLowerCase().trim();
  return Boolean(senderId && currentId && senderId === currentId);
};

// Alias untuk backward compatibility
const isMyMessage = isMine;
const isSender = isMine;
const isSelf = isMine;

// ==========================================
// 🛡️ MULTI-ROLE AUTHORIZATION (canChat) & STATUS PESANAN
// ==========================================
const currentActiveOrderStatus = computed(() => {
  const c = selectedChat.value;
  return c?.orderStatus || c?.order_status || props.orderStatus || (activeRoom.value as any)?.orderStatus || undefined;
});

const isChatAuthorized = computed(() => {
  const myRole = currentUser.value?.role || 'buyer';
  const partnerRole = activePartnerRole.value;
  const status = currentActiveOrderStatus.value;

  // 1. Super Admin / Admin selalu boleh chat ke siapa saja, dan siapa saja boleh chat ke Admin kapan pun
  const pId = String(selectedChat.value?.id || selectedChat.value?.partner_id || '').toLowerCase();
  const pName = String(selectedChat.value?.name || activePartnerName.value || '').toLowerCase();
  const pRole = String(partnerRole || '').toLowerCase();
  const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase();
  const myName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase();
  const mRole = String(myRole || '').toLowerCase();

  const isUserAdmin = (r: string, id: string, name: string) =>
    r === 'super_admin' || r === 'admin' || r === 'superadmin' || r === 'coop_admin' ||
    r.includes('admin') || id.includes('admin') || id.includes('nurmiyaty') || name.includes('admin') || name.includes('nurmiyaty');

  if (isUserAdmin(mRole, myId, myName) || isUserAdmin(pRole, pId, pName)) {
    return true;
  }

  return canChat(myRole, partnerRole, status);
});

const chatRestrictionMessage = computed(() => {
  if (isChatAuthorized.value) return null;
  const myRole = currentUser.value?.role || 'buyer';
  const partnerRole = activePartnerRole.value;
  const status = currentActiveOrderStatus.value;
  return getChatRestrictionReason(myRole, partnerRole, status);
});

function formatTime(timeStr?: string): string {
  if (!timeStr) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
  const str = String(timeStr).trim();
  if (str.includes('T') || (str.includes('-') && !str.includes(':'))) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    } catch {}
  }
  if (str.toLowerCase().includes('am') || str.toLowerCase().includes('pm')) {
    const isPm = str.toLowerCase().includes('pm');
    const clean = str.replace(/[^\d:.]/g, '').trim();
    const parts = clean.split(/[:.]/);
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1].padStart(2, '0');
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  if (str.includes('.') && !str.includes(':')) {
    const parts = str.split('.');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }
  const clean = str.replace('.', ':');
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return clean.substring(0, 5);
}

// ==========================================
// 🔄 SINKRONISASI KONTAK OBROLAN REAL-TIME
// ==========================================
const updateContactLastMessage = (senderOrPartnerId: string, text: string, timestamp?: string, receiverId?: string) => {
  if (!senderOrPartnerId || !text) return;
  const sNorm = normalizeUserId(senderOrPartnerId);
  const rNorm = receiverId ? normalizeUserId(receiverId) : '';
  const myIdNorm = normalizeUserId(currentUser.value?.id);

  // Cari kontak lawan bicara yang cocok secara ketat (bukan akun sendiri)
  const target = contacts.value.find((c: any) => {
    if (isContactSelf(c)) return false;
    const cNorm = normalizeUserId(c.id || c.partner_id || c.email);
    return (
      c.id === senderOrPartnerId ||
      c.partner_id === senderOrPartnerId ||
      (rNorm && (c.id === receiverId || c.partner_id === receiverId)) ||
      (sNorm && cNorm === sNorm && sNorm !== myIdNorm) ||
      (rNorm && cNorm === rNorm && rNorm !== myIdNorm)
    );
  });

  const formattedTime = timestamp ? formatTime(timestamp) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (target) {
    target.lastMessage = text;
    target.last_message = text;
    target.lastMessageTime = formattedTime;
    target.time = formattedTime;
    target._lastMsgTimestamp = timestamp ? new Date(timestamp).getTime() : Date.now();
    // Pindahkan kontak ke urutan paling atas daftar chat
    contacts.value = [target, ...contacts.value.filter((c: any) => c !== target)];
  }
};

const initContactsFromLocalHistory = () => {
  if (typeof window === 'undefined') return;
  try {
    const allStoredMsgs: any[] = [];

    // Baca pesan dari memory state saat ini
    if (Array.isArray(messages.value) && messages.value.length > 0) {
      allStoredMsgs.push(...messages.value);
    }

    // Baca semua key localStorage yang berhubungan dengan obrolan
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('am_history_') || key.startsWith('am_chat_history_') || key.startsWith('am_local_chats_'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              allStoredMsgs.push(...parsed);
            }
          } catch (_) {}
        }
      }
    }

    const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
    const myEmail = String(currentUser.value?.email || '').toLowerCase().trim();
    const myName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase().trim();
    const myRole = String(currentUser.value?.role || '').toLowerCase().trim();

    let hasUpdatedAny = false;

    // 1. Temukan partner percakapan dari riwayat pesan yang belum ada di daftar kontak
    allStoredMsgs.forEach((m: any) => {
      if (!m) return;
      const sId = String(m.senderId || m.sender_id || '').toLowerCase().trim();
      const rId = String(m.receiverId || m.receiver_id || '').toLowerCase().trim();
      const sName = m.senderName || m.sender_name || 'Pengguna Kampus';
      const rName = m.receiverName || m.receiver_name || 'Pengguna Kampus';
      const sRole = m.senderRole || m.sender_role || 'buyer';
      const rRole = m.receiverRole || m.receiver_role || 'buyer';

      const partnerId = (sId && sId !== myId && !sId.includes(myId)) ? sId : ((rId && rId !== myId && !rId.includes(myId)) ? rId : '');
      if (partnerId) {
        const dummy = { id: partnerId, email: partnerId, name: partnerId === sId ? sName : rName };
        if (!isSelfUser(dummy, myId, myEmail, myName, myRole)) {
          const already = contacts.value.some((c: any) => String(c.id).toLowerCase() === partnerId || String(c.partner_id || '').toLowerCase() === partnerId);
          if (!already) {
            const isSender = partnerId === sId;
            const newContact = {
              id: partnerId,
              partner_id: partnerId,
              partner_email: `${partnerId}@campusmart.ac.id`,
              name: isSender ? sName : rName,
              role: isSender ? sRole : rRole,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${partnerId}`,
              lastMessage: m.text || m.content || m.message || 'Halo!',
              last_message: m.text || m.content || m.message || 'Halo!',
              time: m.time || 'Riwayat',
              lastMessageTime: m.time || 'Riwayat',
              _lastMsgTimestamp: new Date(m.createdAt || m.created_at || m.timestamp || 0).getTime() || 1
            };
            contacts.value.push(newContact);
            hasUpdatedAny = true;
          }
        }
      }
    });

    // 2. Perbarui snippet pesan terakhir pada kontak yang ada
    contacts.value.forEach((contact: any) => {
      const cId = String(contact.id || '');
      const cPartnerId = String(contact.partner_id || '');
      const cPartnerEmail = String(contact.partner_email || '');
      const cEmail = String(contact.email || '');
      const cName = String(contact.name || '').toLowerCase();

      const partnerNorms = new Set([
        normalizeUserId(cId),
        normalizeUserId(cPartnerId),
        normalizeUserId(cPartnerEmail),
        normalizeUserId(cEmail),
        normalizeUserId(cName)
      ].filter(Boolean));

      const matchedMsgs = allStoredMsgs.filter((m: any) => {
        if (!m) return false;
        const txt = (m.text || m.content || m.message || '').trim();
        if (!txt) return false;

        const mRoom = String(m.roomId || m.room_id || '').toLowerCase();
        if (cId && (mRoom === cId.toLowerCase() || mRoom.includes(cId.toLowerCase()))) return true;

        const sNorm = normalizeUserId(m.senderId || m.sender_id || (m as any).fromId || '');
        const rNorm = normalizeUserId(m.receiverId || m.receiver_id || (m as any).toId || '');
        const sName = String(m.senderName || m.sender_name || (m as any).fromName || '').toLowerCase();
        const rName = String(m.receiverName || m.receiver_name || (m as any).toName || '').toLowerCase();

        if (partnerNorms.has(sNorm) || partnerNorms.has(rNorm)) return true;

        for (const p of partnerNorms) {
          if (p && mRoom.includes(p)) return true;
        }

        if (cName && (sName.includes(cName) || rName.includes(cName))) return true;

        return false;
      });

      if (matchedMsgs.length > 0) {
        matchedMsgs.sort((a: any, b: any) => {
          const tA = new Date(a.createdAt || a.created_at || a.timestamp || a.time || 0).getTime();
          const tB = new Date(b.createdAt || b.created_at || b.timestamp || b.time || 0).getTime();
          return tA - tB;
        });

        const latestMsg = matchedMsgs[matchedMsgs.length - 1];
        const latestText = latestMsg.text || latestMsg.content || latestMsg.message || '';
        const latestTimeRaw = latestMsg.time || latestMsg.createdAt || latestMsg.created_at || latestMsg.timestamp;

        if (latestText) {
          hasUpdatedAny = true;
          contact.lastMessage = latestText;
          contact.last_message = latestText;
          const formatted = latestTimeRaw ? formatTime(latestTimeRaw) : '';
          contact.lastMessageTime = formatted;
          contact.time = formatted || contact.time;
          contact._lastMsgTimestamp = new Date(latestMsg.createdAt || latestMsg.created_at || latestMsg.timestamp || 0).getTime() || 1;
        }
      }
    });

    if (hasUpdatedAny) {
      contacts.value.sort((a: any, b: any) => {
        const tA = a._lastMsgTimestamp || 0;
        const tB = b._lastMsgTimestamp || 0;
        return tB - tA;
      });
      contacts.value = [...contacts.value];
    }
  } catch (e) {
    console.error('[CampusChatVue] Error initializing contacts from local history:', e);
  }
};

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
}

// ==========================================
// ❤️ HELPER STRUKTUR DATA REAKSI BERBASIS USER ID (DEDUP ANTI-LONJAKAN 4X)
// ==========================================
const getReactionUserList = (reactions: any, emoji: string): string[] => {
  if (!reactions || !reactions[emoji]) return [];
  const val = reactions[emoji];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'number' && val > 0) return ['legacy_user'];
  return [];
};

const hasUserReacted = (reactions: any, emoji: string): boolean => {
  if (!reactions || !reactions[emoji]) return false;
  const val = reactions[emoji];
  const myId = String(currentUser.value?.email || currentUser.value?.id || 'me').toLowerCase().trim();
  if (Array.isArray(val)) {
    return val.some(u => String(u).toLowerCase().trim() === myId);
  }
  return false;
};

const getActiveReactions = (reactions: any): { emoji: string; count: number; hasReacted: boolean }[] => {
  if (!reactions || typeof reactions !== 'object') return [];
  const list: { emoji: string; count: number; hasReacted: boolean }[] = [];
  const myId = String(currentUser.value?.email || currentUser.value?.id || 'me').toLowerCase().trim();

  for (const [emoji, val] of Object.entries(reactions)) {
    let count = 0;
    let userIds: string[] = [];
    if (Array.isArray(val)) {
      userIds = val.map(String);
      count = userIds.length;
    } else if (typeof val === 'number') {
      count = Math.max(0, val);
    }
    if (count > 0) {
      const reacted = userIds.some(u => u.toLowerCase().trim() === myId);
      list.push({ emoji, count, hasReacted: reacted });
    }
  }
  return list;
};

const mergeReactions = (existing: any, incoming: any): Record<string, string[] | number> => {
  const result: Record<string, any> = { ...(existing || {}) };
  if (!incoming || typeof incoming !== 'object') return result;

  for (const [emoji, val] of Object.entries(incoming)) {
    if (Array.isArray(val)) {
      const currentList: string[] = Array.isArray(result[emoji])
        ? result[emoji]
        : (typeof result[emoji] === 'number' && result[emoji] > 0 ? ['legacy_user'] : []);
      const merged = Array.from(new Set([...currentList, ...val.map(String)]));
      result[emoji] = merged;
    } else if (typeof val === 'number') {
      if (!result[emoji]) {
        result[emoji] = val;
      }
    }
  }
  return result;
};

// 🛡️ DEDUPLIKASI KETAT DENGAN SINGLETON MAP (MENCEGAH DOUBLING DI HP & DESKTOP)
const appendMessageSafe = (newMsg: any): boolean => {
  if (!newMsg) return false;

  const rawSenderId = String(newMsg.sender_id || newMsg.senderId || (newMsg as any).fromId || '');
  const normSenderId = normalizeUserId(rawSenderId);
  const textContent = String(newMsg.text || newMsg.content || '').trim();
  if (!textContent) return false;

  const rawTime = String(newMsg.time || formatTime(newMsg.created_at || newMsg.createdAt) || '');
  const minuteKey = formatTime(rawTime);
  const contentFingerprint = `${normSenderId || rawSenderId}_${textContent}_${minuteKey}`;
  const newTimeMs = new Date(newMsg.created_at || newMsg.createdAt || 0).getTime();

  // Cek apakah ID atau konten sidik jari sudah pernah masuk
  const exists = Array.from(rawMessagesMap.values()).some(m => {
    // 1. Cek ID persis
    if (newMsg.id != null && m.id != null && String(m.id) === String(newMsg.id)) {
      if (newMsg.reactions && Object.keys(newMsg.reactions).length > 0) {
        m.reactions = mergeReactions(m.reactions, newMsg.reactions);
      }
      // ✏️ Jika pesan ber-ID sama membawa teks hasil edit yang lebih baru, perbarui teks seketika
      const isNewEdited = Boolean(newMsg.is_edited || newMsg.isEdited);
      const isNewTextDifferent = newMsg.text && m.text && String(newMsg.text).trim() !== String(m.text).trim();
      if (isNewEdited || (isNewTextDifferent && (newMsg.updated_at || newMsg.updatedAt || newMsg.edited_at))) {
        const newTxt = newMsg.text || newMsg.content;
        const newEditTime = newMsg.edited_at || newMsg.updated_at || newMsg.updatedAt || new Date().toISOString();
        m.text = newTxt;
        m.content = newTxt;
        m.is_edited = true;
        m.isEdited = true;
        m.edited_at = newEditTime;
        m.updated_at = newEditTime;
        m.updatedAt = newEditTime;
        syncMessagesFromMap();
      }
      return true;
    }

    const mSenderId = String(m.sender_id || m.senderId || (m as any).fromId || '');
    const mNormSenderId = normalizeUserId(mSenderId);
    const mTextContent = String(m.text || m.content || '').trim();
    const mRawTime = String(m.time || formatTime(m.created_at || m.createdAt) || '');
    const mMinute = formatTime(mRawTime);

    const isSameSender = (mNormSenderId && normSenderId && mNormSenderId === normSenderId) ||
                         (mSenderId && rawSenderId && mSenderId === rawSenderId);
    const isSameText = mTextContent.toLowerCase() === textContent.toLowerCase();

    // 2. Proteksi Double Submit / Burst Event (dalam jendela waktu 4.5 detik atau menit sama)
    if (isSameSender && isSameText) {
      const mTimeMs = new Date(m.created_at || m.createdAt || 0).getTime();
      if (newTimeMs > 0 && mTimeMs > 0 && Math.abs(newTimeMs - mTimeMs) < 4500) {
        return true;
      }
      if (mMinute && minuteKey && mMinute === minuteKey) {
        return true;
      }
    }

    const mFingerprint = `${mNormSenderId || mSenderId}_${mTextContent}_${mMinute}`;
    return mFingerprint === contentFingerprint;
  });

  if (exists) {
    return false; // TOLAK DUPLIKASI
  }

  const messageKey = String(newMsg.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)));
  const isMine = isSender(newMsg);

  // ↩️ Normalisasi data balasan (Reply) lengkap dengan pencarian referensi ID
  let safeReply: any = newMsg.replyTo || newMsg.reply_to || null;
  if (typeof safeReply === 'string') {
    if (safeReply.startsWith('{')) {
      try { safeReply = JSON.parse(safeReply); } catch (_) {}
    } else {
      const refMsg = Array.from(rawMessagesMap.values()).find(m => String(m.id) === String(safeReply)) ||
                     messages.value.find((m: any) => String(m.id) === String(safeReply));
      if (refMsg) {
        safeReply = {
          id: refMsg.id,
          senderName: refMsg.senderName || refMsg.sender_name || 'Pengguna',
          sender_name: refMsg.senderName || refMsg.sender_name || 'Pengguna',
          text: refMsg.text || refMsg.content || '',
          content: refMsg.text || refMsg.content || ''
        };
      }
    }
  }
  if (safeReply && typeof safeReply === 'object') {
    if (safeReply.id && (!safeReply.text && !safeReply.content)) {
      const refMsg = Array.from(rawMessagesMap.values()).find(m => String(m.id) === String(safeReply.id)) ||
                     messages.value.find((m: any) => String(m.id) === String(safeReply.id));
      if (refMsg) {
        safeReply.text = refMsg.text || refMsg.content || '';
        safeReply.content = refMsg.text || refMsg.content || '';
        safeReply.senderName = safeReply.senderName || safeReply.sender_name || refMsg.senderName || refMsg.sender_name || 'Pengguna';
        safeReply.sender_name = safeReply.senderName || safeReply.sender_name || refMsg.senderName || refMsg.sender_name || 'Pengguna';
      }
    }
    safeReply = {
      id: safeReply.id,
      senderName: safeReply.senderName || safeReply.sender_name || 'Pengguna',
      sender_name: safeReply.senderName || safeReply.sender_name || 'Pengguna',
      text: safeReply.text || safeReply.content || '',
      content: safeReply.text || safeReply.content || ''
    };
  }

  const safeMsg = {
    ...newMsg,
    id: messageKey,
    text: textContent,
    content: textContent,
    sender_id: rawSenderId || normSenderId,
    senderId: rawSenderId || normSenderId,
    sender_name: newMsg.sender_name || newMsg.senderName || (newMsg as any).fromName,
    senderName: newMsg.senderName || newMsg.sender_name || (newMsg as any).fromName,
    sender_role: newMsg.sender_role || newMsg.senderRole || (newMsg as any).fromRole,
    senderRole: newMsg.senderRole || newMsg.sender_role || (newMsg as any).fromRole,
    receiver_id: newMsg.receiver_id || newMsg.receiverId || (newMsg as any).toId,
    receiverId: newMsg.receiverId || newMsg.receiver_id || (newMsg as any).toId,
    created_at: newMsg.created_at || newMsg.createdAt || new Date().toISOString(),
    createdAt: newMsg.createdAt || newMsg.created_at || new Date().toISOString(),
    time: rawTime || formatTime(new Date().toISOString()),
    is_self: isMine,
    isSelf: isMine,
    replyTo: safeReply,
    reply_to: safeReply
  };

  rawMessagesMap.set(messageKey, safeMsg);
  syncMessagesFromMap();

  // 💾 Simpan pesan baru ke cache histori lokal deterministik
  try {
    const curRoom = activeRoom.value?.id || getRoomId(currentUser.value?.id, selectedChat.value?.id);
    if (curRoom) {
      const existingHistoryStr = localStorage.getItem(`am_history_${curRoom}`) || localStorage.getItem(`am_chat_history_${curRoom}`);
      const existingHistory: any[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
      if (!existingHistory.some((m: any) => String(m.id) === String(safeMsg.id))) {
        existingHistory.push(safeMsg);
        localStorage.setItem(`am_history_${curRoom}`, JSON.stringify(existingHistory));
        localStorage.setItem(`am_chat_history_${curRoom}`, JSON.stringify(existingHistory));
      }
    }
  } catch (_e) {}

  scrollToBottom();
  return true;
};

// 📦 GABUNGKAN HISTORI DARI STORAGE LOKAL SECARA DINAMIS & DETERMINISTIK
const getUnifiedChatHistory = (userIdA: string, userIdB: string): ChatMessage[] => {
  const normA = normalizeUserId(userIdA);
  const normB = normalizeUserId(userIdB);
  const targetRoomId = getRoomId(normA, normB);

  const mergedMap = new Map<string, ChatMessage>();

  const isPairMatch = (m: any): boolean => {
    if (!m) return false;
    const txt = (m.text || m.content || m.message || '').trim();
    if (!txt) return false;

    const s = normalizeUserId(m.senderId || m.sender_id || (m as any).fromId || m.senderName || m.sender_name);
    const r = normalizeUserId(m.receiverId || m.receiver_id || (m as any).toId || m.receiverName || m.receiver_name);
    const mRoom = String(m.roomId || m.room_id || '').toLowerCase();

    // 1. Jika room ID cocok atau mengandung kedua user
    if (mRoom) {
      if (mRoom === targetRoomId.toLowerCase()) return true;
      if (mRoom.includes(normA) && mRoom.includes(normB)) return true;
    }

    // 2. Jika pengirim & penerima cocok bolak-balik
    if ((s === normA && r === normB) || (s === normB && r === normA)) {
      return true;
    }
    if ((s === normA || s === normB) && (!r || r === normA || r === normB)) {
      return true;
    }

    return false;
  };

  const addMessagesFromArray = (arr: any[]) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(m => {
      if (!isPairMatch(m)) return;
      const text = (m.text || m.content || m.message || '').trim();
      const sId = m.senderId || m.sender_id || (m as any).fromId;
      const sNorm = normalizeUserId(sId || m.senderName || m.sender_name);

      const timeMs = new Date(m.created_at || m.createdAt || m.timestamp || 0).getTime();
      const validCreatedAt = timeMs > 0 ? (m.created_at || m.createdAt || new Date(timeMs).toISOString()) : new Date().toISOString();
      const validTime = m.time || formatTime(validCreatedAt);

      // Kunci deduplikasi cerdas: pengirim + teks + menit
      const minKey = validTime.replace('.', ':').slice(0, 5);

      const canonicalSender = (sNorm === normA || sNorm === normB) ? sNorm : normA;
      const canonicalReceiver = canonicalSender === normA ? normB : normA;
      const canonicalSenderName = m.senderName || m.sender_name || 'Pengguna';
      const canonicalReceiverName = m.receiverName || m.receiver_name || 'Pengguna';
      const canonicalRole = m.senderRole || m.sender_role || 'buyer';

      const dedupKey = `${canonicalSender}_${text}_${minKey}`;
      const msgId = String(m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

      if (!mergedMap.has(dedupKey)) {
        mergedMap.set(dedupKey, {
          ...m,
          id: msgId,
          roomId: targetRoomId,
          room_id: targetRoomId,
          text,
          content: text,
          senderId: canonicalSender,
          sender_id: canonicalSender,
          senderName: canonicalSenderName,
          sender_name: canonicalSenderName,
          senderRole: canonicalRole,
          sender_role: canonicalRole,
          receiverId: canonicalReceiver,
          receiver_id: canonicalReceiver,
          receiverName: canonicalReceiverName,
          receiver_name: canonicalReceiverName,
          receiverRole: m.receiverRole || m.receiver_role || 'buyer',
          receiver_role: m.receiverRole || m.receiver_role || 'buyer',
          is_self: undefined,
          isSelf: undefined,
          is_me: undefined,
          isMe: undefined,
          time: validTime,
          created_at: validCreatedAt,
          createdAt: validCreatedAt
        });
      }
    });
  };

  // 1. Baca semua key yang ada di localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('am_history_v10_') || key.startsWith('am_chat_history_v10_') || key.startsWith('am_history_') || key.startsWith('am_chat_history_'))) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                addMessagesFromArray(parsed);
              }
            }
          } catch (_e) {}
        }
      }
    } catch (_e) {}
  }

  // 2. Baca dari memori pesan aktif jika ada
  if (Array.isArray(messages.value)) {
    addMessagesFromArray(messages.value);
  }

  // 3. Urutkan berdasarkan created_at secara kronologis (timestamp terlama di atas)
  const sorted = Array.from(mergedMap.values()).sort((a, b) => {
    const tA = new Date(a.created_at || a.createdAt || a.time || 0).getTime();
    const tB = new Date(b.created_at || b.createdAt || b.time || 0).getTime();
    return tA - tB;
  });

  // 4. Simpan kembali ke am_history_v10_${targetRoomId} dan am_chat_history_v10_${targetRoomId}
  try {
    localStorage.setItem(`am_history_v10_${targetRoomId}`, JSON.stringify(sorted));
    localStorage.setItem(`am_chat_history_v10_${targetRoomId}`, JSON.stringify(sorted));
    localStorage.setItem(`am_history_${targetRoomId}`, JSON.stringify(sorted));
  } catch (_e) {}

  return sorted;
};

// 📥 MUAT RIWAYAT OBROLAN (< 24 JAM) DARI CLOUD SYNC & CACHE LOKAL
const loadChatHistory = async () => {
  try {
    const myId = currentUser.value?.id || 'admin_nurmiyaty';
    const myNormId = normalizeUserId(myId);
    const partnerId = (activeRoom.value as any)?.otherId || selectedChat.value?.id || selectedChat.value?.partner_id || (myNormId === 'admin_nurmiyaty' ? 'coop_koperasi' : 'admin_nurmiyaty');
    const partnerNormId = normalizeUserId(partnerId);
    const targetRoomId = getRoomId(myNormId, partnerNormId);

    // 1. Ambil dari gabungan cache lokal yang terpisah (instan render & self-healing)
    const unifiedMsgs = getUnifiedChatHistory(myId, partnerId);
    if (unifiedMsgs.length > 0) {
      markExistingAsNotified(unifiedMsgs);
      unifiedMsgs.forEach(m => appendMessageSafe(m));
      initContactsFromLocalHistory();
    }

    // 2. Ambil dari Upstash Redis Cloud & Local Storage
    try {
      const myNorm = normalizeUserId(myId);
      const res = await fetchCloudChats(myNorm);
      if (res && res.chats && res.chats.length > 0) {
        markExistingAsNotified(res.chats);
        res.chats.forEach(m => {
          const sNorm = normalizeUserId(m.senderId || (m as any).sender_id);
          const rNorm = normalizeUserId(m.receiverId || (m as any).receiver_id);
          const mRoom = m.roomId || (m as any).room_id || getRoomId(sNorm, rNorm);

          const isMatch = mRoom === targetRoomId ||
            ((sNorm === normalizeUserId(myId) && rNorm === normalizeUserId(partnerId)) ||
             (sNorm === normalizeUserId(partnerId) && rNorm === normalizeUserId(myId)));

          if (isMatch) {
            appendMessageSafe({
              ...m,
              roomId: targetRoomId,
              room_id: targetRoomId
            });
          }
        });
        initContactsFromLocalHistory();
      }
    } catch (_e) {}

    scrollToBottom();
  } catch (err) {
    console.error('Error loading chat history:', err);
  }
};

// Alias kompatibilitas
const addMessageUnique = appendMessageSafe;

// ==========================================
// ❤️ SINKRONISASI REAKSI EMOJI (❤️, 👍, 😂) REAL-TIME
// ==========================================
const applyLocalReaction = (
  msgId: string | number,
  emoji: string,
  userId?: string,
  mode: 'toggle' | 'add' | 'remove' = 'add'
) => {
  const sMsgId = String(msgId);
  const target = Array.from(rawMessagesMap.values()).find(m => String(m.id) === sMsgId);
  if (!target) return;

  if (!target.reactions) {
    target.reactions = {};
  }

  const uId = String(userId || currentUser.value?.email || currentUser.value?.id || 'me').toLowerCase().trim();
  
  let userList: string[] = [];
  if (Array.isArray(target.reactions[emoji])) {
    userList = [...target.reactions[emoji]];
  } else if (typeof target.reactions[emoji] === 'number') {
    const legacyCount = target.reactions[emoji] as number;
    userList = legacyCount > 0 ? ['legacy_user'] : [];
  }

  const existingIndex = userList.findIndex(u => u.toLowerCase().trim() === uId);

  if (mode === 'toggle') {
    if (existingIndex >= 0) {
      userList.splice(existingIndex, 1);
    } else {
      userList.push(uId);
    }
  } else if (mode === 'add') {
    if (existingIndex === -1) {
      userList.push(uId);
    }
  } else if (mode === 'remove') {
    if (existingIndex >= 0) {
      userList.splice(existingIndex, 1);
    }
  }

  target.reactions[emoji] = userList;
  syncMessagesFromMap();

  // Simpan ke localStorage am_chat_reactions
  try {
    const raw = localStorage.getItem('am_chat_reactions') || '{}';
    const store = JSON.parse(raw);
    const currentRoomId = String(activeRoom.value?.id || props.roomId || 'global').toLowerCase().trim();
    const key = `${currentRoomId}_${sMsgId}`;
    if (!store[key]) store[key] = {};
    store[key][emoji] = userList;
    localStorage.setItem('am_chat_reactions', JSON.stringify(store));
  } catch (_e) {}
};

const handleReactToMessage = async (msgId: any, emoji: string) => {
  if (!msgId || !emoji) return;
  const sMsgId = String(msgId);
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || 'admin_nurmiyaty';
  const myId = String(currentUser.value?.email || currentUser.value?.id || 'me').toLowerCase().trim();

  // 1. Tentukan apakah aksi ini toggle add atau toggle remove
  const target = Array.from(rawMessagesMap.values()).find(m => String(m.id) === sMsgId);
  let isCurrentlyReacted = false;
  if (target?.reactions && target.reactions[emoji]) {
    const val = target.reactions[emoji];
    if (Array.isArray(val)) {
      isCurrentlyReacted = val.some(u => String(u).toLowerCase().trim() === myId);
    }
  }
  const mode: 'add' | 'remove' = isCurrentlyReacted ? 'remove' : 'add';

  // 1. Update status reaksi lokal seketika (toggle on/off)
  applyLocalReaction(sMsgId, emoji, myId, mode);

  // 2. Siarkan ke Upstash Redis Cloud Sync & BroadcastChannel
  try {
    await syncCloudReaction(sMsgId, emoji, String(currentRoomId), myId, mode);
  } catch (_e) {}

  // 3. Siarkan ke Soketi Room Channel Real-Time
  try {
    broadcastSoketiAction(currentUser.value.id, String(partnerId), 'ReactionAdded', {
      id: sMsgId,
      msgId: sMsgId,
      emoji,
      userId: myId,
      action: mode,
      roomId: String(currentRoomId)
    });
  } catch (_e) {}

  // 4. Kirim ke WebSocket jika aktif
  try {
    const globalSocket = typeof window !== 'undefined' ? (window as any).socket : undefined;
    if (globalSocket && globalSocket.emit) {
      globalSocket.emit('chat_reaction', {
        msgId: sMsgId,
        emoji,
        roomId: String(currentRoomId),
        userId: myId,
        action: mode
      });
    }
  } catch (_e) {}
};

// ==========================================
// ✏️🗑️ MANAJEMEN AKSI PESAN (EDIT & HAPUS REAL-TIME)
// ==========================================
const startEditMessage = (msg: any) => {
  editingMessageId.value = msg.id != null ? msg.id : (msg.client_id || msg._id || null);
  editingText.value = msg.text || msg.content || '';
};

const cancelEditMessage = () => {
  editingMessageId.value = null;
  editingText.value = '';
};

// 💾 Helper Simpan & Perbarui Cache Lokal Obrolan
const saveToLocalCache = (roomId: string, msgs: ChatMessage[]) => {
  if (typeof window === 'undefined' || !roomId) return;
  try {
    localStorage.setItem(`am_chat_history_${roomId}`, JSON.stringify(msgs));
  } catch (_e) {}
};

const updateAllLocalChatCaches = (targetIdStr: string, newText: string, editedAt: string, oldText?: string) => {
  if (typeof window === 'undefined') return;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('am_local_chats_') || key.startsWith('am_chat_history_'))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            let changed = false;
            const updated = list.map((m: any) => {
              const idMatch = (m.id != null && String(m.id) === targetIdStr) ||
                              (m.client_id && String(m.client_id) === targetIdStr) ||
                              (m._id && String(m._id) === targetIdStr);
              const textMatch = !idMatch && oldText && ((m.text || m.content || '').trim() === oldText.trim());
              if (idMatch || textMatch) {
                changed = true;
                return {
                  ...m,
                  text: newText,
                  content: newText,
                  is_edited: true,
                  isEdited: true,
                  edited_at: editedAt,
                  updated_at: editedAt,
                  updatedAt: editedAt
                };
              }
              return m;
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(updated));
            }
          }
        } catch (_err) {}
      }
    }
  } catch (_e) {}
};

const submitEditMessage = async () => {
  if (editingMessageId.value == null || !editingText.value.trim()) return;
  const msgId = editingMessageId.value;
  const newText = editingText.value.trim();
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || 'admin_nurmiyaty';
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';

  const targetMsg = messages.value.find(m => String(m.id) === String(msgId) || ((m as any).client_id && String((m as any).client_id) === String(msgId)));
  const oldText = targetMsg?.text || targetMsg?.content || '';
  const clientId = (targetMsg as any)?.client_id;
  const editedAt = new Date().toISOString();

  // 1. Update lokal seketika
  handleIncomingMessageUpdated({
    id: msgId,
    client_id: clientId,
    text: newText,
    old_text: oldText,
    sender_id: currentUser.value.id,
    edited_at: editedAt
  });

  // 2. Sync ke Cloud, LocalStorage & Soketi
  await syncCloudMessageUpdate(msgId, newText, currentUser.value.id, String(partnerId), {
    oldText,
    clientId,
    roomId: String(currentRoomId)
  });

  // 3. POST ke FrankenPHP Backend (/api/chat/edit)
  try {
    fetch('/api/chat/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgId,
        client_id: clientId,
        text: newText,
        room_id: String(currentRoomId),
        sender_id: currentUser.value.id
      })
    }).catch(() => {});
  } catch (_e) {}

  cancelEditMessage();
};

const handleDeleteMessage = async (msgId: string | number | undefined) => {
  if (msgId == null) return;
  const confirmed = typeof window !== 'undefined' ? window.confirm('Apakah Anda yakin ingin menghapus pesan ini untuk semua orang?') : true;
  if (!confirmed) return;

  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || 'admin_nurmiyaty';
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';

  // 1. Update status lokal seketika
  handleIncomingMessageDeleted({ id: msgId });

  // 2. Sync ke Cloud, LocalStorage & Soketi
  await syncCloudMessageDelete(msgId, currentUser.value.id, String(partnerId));

  // 3. POST ke FrankenPHP Backend (/api/chat/delete)
  try {
    fetch('/api/chat/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: msgId,
        room_id: String(currentRoomId),
        user_id: currentUser.value.id
      })
    }).catch(() => {});
  } catch (_e) {}
};

const handleIncomingMessageUpdated = (data: {
  id: string | number;
  text: string;
  edited_at?: string;
  updated_at?: string;
  updatedAt?: string;
  client_id?: string | number;
  old_text?: string;
  sender_id?: string;
  time?: string;
}) => {
  if (!data || data.id == null) return;
  
  const targetIdStr = String(data.id);
  const targetClientIdStr = data.client_id ? String(data.client_id) : '';
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';
  const editedAt = data.edited_at || data.updated_at || data.updatedAt || new Date().toISOString();

  // 1. Cari berdasarkan ID numerik maupun string, client_id, atau fallback ke timestamp/fingerprint
  let msgIndex = messages.value.findIndex(m => 
    String(m.id) === targetIdStr || 
    ((m as any).client_id && String((m as any).client_id) === targetIdStr) ||
    (targetClientIdStr && String(m.id) === targetClientIdStr) ||
    (targetClientIdStr && (m as any).client_id && String((m as any).client_id) === targetClientIdStr) ||
    ((m as any)._id && String((m as any)._id) === targetIdStr)
  );

  // Fallback pencocokan jika ID temporer tidak sama persis (misal via old_text & sender)
  if (msgIndex === -1 && data.old_text) {
    const oldClean = data.old_text.trim();
    msgIndex = messages.value.findIndex(m => {
      const mText = (m.text || m.content || '').trim();
      if (mText && mText === oldClean) {
        if (data.sender_id) {
          const sNorm = normalizeUserId(data.sender_id);
          const mNorm = normalizeUserId(m.sender_id || m.senderId);
          return sNorm === mNorm;
        }
        return true;
      }
      return false;
    });
  }

  if (msgIndex !== -1) {
    // Update properti pesan secara reaktif
    const updatedMsg = {
      ...messages.value[msgIndex],
      text: data.text,
      content: data.text,
      is_edited: true,
      isEdited: true,
      edited_at: editedAt,
      updated_at: editedAt,
      updatedAt: editedAt
    };
    messages.value[msgIndex] = updatedMsg;

    // Sinkronkan juga rawMessagesMap agar appendMessageSafe konsisten
    const mapKey = String(updatedMsg.id || targetIdStr);
    rawMessagesMap.set(mapKey, updatedMsg);
    for (const [k, v] of rawMessagesMap.entries()) {
      if (
        String(v.id) === targetIdStr ||
        ((v as any).client_id && String((v as any).client_id) === targetIdStr) ||
        (data.old_text && (v.text === data.old_text || v.content === data.old_text))
      ) {
        rawMessagesMap.set(k, { ...v, ...updatedMsg });
      }
    }
  } else {
    // Coba periksa di rawMessagesMap jika messages.value belum terisi
    let foundInMap = false;
    for (const [k, v] of rawMessagesMap.entries()) {
      if (
        String(v.id) === targetIdStr ||
        ((v as any).client_id && String((v as any).client_id) === targetIdStr) ||
        (data.old_text && (v.text === data.old_text || v.content === data.old_text))
      ) {
        rawMessagesMap.set(k, {
          ...v,
          text: data.text,
          content: data.text,
          is_edited: true,
          isEdited: true,
          edited_at: editedAt,
          updated_at: editedAt,
          updatedAt: editedAt
        });
        foundInMap = true;
      }
    }
    if (foundInMap) {
      syncMessagesFromMap();
    }
  }

  // 2. Perbarui cache lokal agar saat reload teks editan tetap bertahan
  saveToLocalCache(String(currentRoomId), messages.value);
  updateAllLocalChatCaches(targetIdStr, data.text, editedAt, data.old_text);
};

const handleIncomingMessageDeleted = (data: { id: string | number; client_id?: string | number }) => {
  if (!data || data.id == null) return;
  const sId = String(data.id);
  const targetClientIdStr = data.client_id ? String(data.client_id) : '';
  const delText = 'Pesan ini telah dihapus untuk semua orang';
  
  const msgIndex = messages.value.findIndex(m =>
    String(m.id) === sId ||
    ((m as any).client_id && String((m as any).client_id) === sId) ||
    (targetClientIdStr && String(m.id) === targetClientIdStr) ||
    (targetClientIdStr && (m as any).client_id && String((m as any).client_id) === targetClientIdStr) ||
    ((m as any)._id && String((m as any)._id) === sId)
  );
  if (msgIndex !== -1) {
    messages.value[msgIndex] = {
      ...messages.value[msgIndex],
      text: delText,
      content: delText,
      is_deleted: true,
      isDeleted: true
    };
  }
  for (const [k, v] of rawMessagesMap.entries()) {
    if (
      String(v.id) === sId ||
      ((v as any).client_id && String((v as any).client_id) === sId) ||
      (targetClientIdStr && String(v.id) === targetClientIdStr)
    ) {
      rawMessagesMap.set(k, {
        ...v,
        text: delText,
        content: delText,
        is_deleted: true,
        isDeleted: true
      });
    }
  }
  syncMessagesFromMap();
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';
  saveToLocalCache(String(currentRoomId), messages.value);
};

const handleIncomingReactionAdded = (data: { id?: string | number; msgId?: string | number; emoji: string; userId?: string; action?: 'add' | 'remove' | 'toggle' }) => {
  const mId = data.msgId != null ? data.msgId : data.id;
  if (mId != null && data.emoji) {
    const mode = data.action === 'remove' ? 'remove' : 'add';
    applyLocalReaction(mId, data.emoji, data.userId, mode);
  }
};

// ⌨️ Handler Mengetik Real-time ke Soketi & BroadcastChannel
const handleTypingInput = () => {
  const currentUserId = currentUser.value?.id;
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || 'admin_nurmiyaty';
  const roomId = String(activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'room_default');
  const myName = currentUser.value?.name || 'Pengguna Kampus';

  if (!currentUserId || !partnerId) return;

  try {
    broadcastSoketiAction(currentUserId, String(partnerId), 'typing', {
      roomId,
      userId: currentUserId,
      name: myName,
      userName: myName,
      isTyping: true
    });
  } catch (_e) {}

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    try {
      broadcastSoketiAction(currentUserId, String(partnerId), 'typing', {
        roomId,
        userId: currentUserId,
        name: myName,
        userName: myName,
        isTyping: false
      });
    } catch (_e) {}
  }, 1800);
};

// ==========================================
// 📨 PENANGAN PESAN MASUK DARI SOKETI / PUSHER / ECHO / STORAGE EVENT
// ==========================================
const handleIncomingMessage = (rawMsg: any) => {
  if (!rawMsg) return;
  if (typeof rawMsg === 'string') {
    try { rawMsg = JSON.parse(rawMsg); } catch (_) {}
  }
  if (rawMsg?.data && typeof rawMsg.data === 'object') {
    rawMsg = { ...rawMsg.data, ...rawMsg };
  } else if (typeof rawMsg?.data === 'string') {
    try {
      const parsedData = JSON.parse(rawMsg.data);
      rawMsg = { ...parsedData, ...rawMsg };
    } catch (_) {}
  }

  const msgText = (rawMsg.text || rawMsg.content || rawMsg.message || '').trim();
  if (!msgText && !rawMsg.mediaUrl) return;

  const rawSenderId = String(rawMsg.senderId || rawMsg.sender_id || rawMsg.sender || rawMsg.fromId || '');
  const rawReceiverId = String(rawMsg.receiverId || rawMsg.receiver_id || rawMsg.toId || '');
  const msgTimestamp = rawMsg.timestamp || rawMsg.createdAt || rawMsg.created_at || new Date().toISOString();
  const msgTime = rawMsg.time || formatTime(msgTimestamp);

  const senderNorm = normalizeUserId(rawSenderId || rawMsg.senderName || rawMsg.sender_name);
  const receiverNorm = normalizeUserId(rawReceiverId || rawMsg.receiverName || rawMsg.receiver_name);
  const myNorm = normalizeUserId(currentUser.value?.id || '');
  const currentId = String(currentUser.value?.id || '').trim().toLowerCase();

  // 🛑 1. ABAIKAN JIKA PENGIRIM ADALAH DIRI SENDIRI:
  if (
    rawSenderId === currentUser.value?.id ||
    rawSenderId.toLowerCase() === currentId ||
    (senderNorm && myNorm && senderNorm === myNorm)
  ) {
    return;
  }

  // 💬 Normalisasi data balasan (Reply) jika ada
  let normalizedReply: any = rawMsg.replyTo || rawMsg.reply_to || null;
  if (typeof normalizedReply === 'string') {
    if (normalizedReply.startsWith('{')) {
      try { normalizedReply = JSON.parse(normalizedReply); } catch (_) {}
    } else {
      const refMsg = Array.from(rawMessagesMap.values()).find(m => String(m.id) === String(normalizedReply)) ||
                     messages.value.find((m: any) => String(m.id) === String(normalizedReply));
      if (refMsg) {
        normalizedReply = {
          id: refMsg.id,
          senderName: refMsg.senderName || refMsg.sender_name || 'Pengguna',
          sender_name: refMsg.senderName || refMsg.sender_name || 'Pengguna',
          text: refMsg.text || refMsg.content || '',
          content: refMsg.text || refMsg.content || ''
        };
      }
    }
  }
  if (normalizedReply && typeof normalizedReply === 'object') {
    normalizedReply = {
      id: normalizedReply.id,
      senderName: normalizedReply.senderName || normalizedReply.sender_name || 'Pengguna',
      sender_name: normalizedReply.senderName || normalizedReply.sender_name || 'Pengguna',
      text: normalizedReply.text || normalizedReply.content || '',
      content: normalizedReply.text || normalizedReply.content || ''
    };
  }

  // 🎯 PENANGANAN PESAN MASUK UNIVERSAL (MURNI DINAMIS)
  const activePartner = selectedChat.value || defaultPartner.value;
  const currentRoom = getRoomId(currentUser.value?.id || '', activePartner?.id || '');
  const incomingRoomId = String(rawMsg.roomId || rawMsg.room_id || '');
  const partnerNorm = normalizeUserId(activePartner?.id || activePartner?.partner_id);

  // 🛑 2. PERIKSA APAKAH PESAN DITUJUKAN UNTUK USER INI ATAU ROOM INI:
  const isForMe =
    !receiverNorm || // siaran broadcast tanpa receiver spesifik
    receiverNorm === myNorm ||
    rawReceiverId === currentUser.value?.id ||
    rawReceiverId.toLowerCase() === currentId ||
    (senderNorm && partnerNorm && senderNorm === partnerNorm);

  if (!isForMe && receiverNorm && myNorm && receiverNorm !== myNorm) {
    return; // Bukan untuk akun ini
  }

  // 3. Cek apakah room pesan yang masuk sedang dibuka saat ini:
  const cleanIncomingRoom = incomingRoomId
    ? incomingRoomId.replace(/^chat\./, '').replace(/^chat-room-/, '').replace(/^room_/, '').toLowerCase()
    : '';
  const cleanCurrentRoom = currentRoom.replace(/^room_/, '').toLowerCase();

  const isCurrentRoomOpen = Boolean(activePartner) && (
    (incomingRoomId && incomingRoomId.toLowerCase() === currentRoom.toLowerCase()) ||
    (cleanIncomingRoom && cleanIncomingRoom === cleanCurrentRoom) ||
    (senderNorm && partnerNorm && senderNorm === partnerNorm) ||
    (rawSenderId && activePartner?.id && String(rawSenderId).toLowerCase() === String(activePartner.id).toLowerCase())
  );

  // 4. Data balasan sudah dinormalisasi pada awal fungsi

  // 5. Bentuk objek pesan LAWAN BICARA (⚪ SELALU DI KIRI / PUTIH: is_me = false)
  const resolvedPartnerName = (activePartner && (activePartner.id === rawSenderId || partnerNorm === senderNorm))
    ? activePartner.name
    : (rawMsg.senderName || rawMsg.sender_name || 'Lawan Bicara');
  const resolvedPartnerRole = (activePartner && (activePartner.id === rawSenderId || partnerNorm === senderNorm))
    ? activePartner.role
    : (rawMsg.senderRole || rawMsg.sender_role || 'seller');

  const targetRoomKey = incomingRoomId || getRoomId(rawSenderId, currentUser.value?.id || '');

  const msg = {
    id: rawMsg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roomId: targetRoomKey,
    room_id: targetRoomKey,
    senderId: rawSenderId || (activePartner ? activePartner.id : 'sender'),
    sender_id: rawSenderId || (activePartner ? activePartner.id : 'sender'),
    senderName: resolvedPartnerName,
    sender_name: resolvedPartnerName,
    senderRole: resolvedPartnerRole,
    sender_role: resolvedPartnerRole,
    receiverId: rawReceiverId || currentUser.value?.id,
    receiver_id: rawReceiverId || currentUser.value?.id,
    text: msgText,
    content: msgText,
    timestamp: msgTimestamp,
    createdAt: msgTimestamp,
    created_at: msgTimestamp,
    time: msgTime,
    replyTo: normalizedReply,
    reply_to: normalizedReply,
    reactions: rawMsg.reactions || {},
    is_me: false, // ⚪ JAMIN DI KIRI / PUTIH
    isMe: false,
    is_self: false,
    isSelf: false
  };

  // 6. Masukkan ke UI messages jika room ini sedang aktif
  if (isCurrentRoomOpen) {
    const exists = messages.value.some((m: any) =>
      String(m.id) === String(msg.id) ||
      (m.text === msg.text && (m.time === msg.time || Math.abs(new Date(m.created_at || m.createdAt || 0).getTime() - new Date(msgTimestamp).getTime()) < 3000))
    );
    if (!exists) {
      messages.value.push(msg);
      rawMessagesMap.set(String(msg.id), msg);
      syncMessagesFromMap();
      triggerNotificationBeepAndToast(msg);
      scrollToBottom();
    } else {
      const existing = messages.value.find((m: any) => String(m.id) === String(msg.id));
      if (existing && !existing.replyTo && normalizedReply) {
        existing.replyTo = normalizedReply;
        existing.reply_to = normalizedReply;
      }
    }
  } else {
    // Room tidak sedang dibuka: beri notifikasi toast & beep dan naikkan unread badge
    triggerNotificationBeepAndToast(msg);
    const pId = rawSenderId || (activePartner ? activePartner.id : '');
    if (pId) incrementUnread(pId);
  }

  // 7. Simpan ke localStorage kedua sisi agar tidak hilang saat refresh
  try {
    const roomKeys = Array.from(new Set([targetRoomKey, currentRoom, incomingRoomId].filter(Boolean)));
    roomKeys.forEach(r => {
      const histKey = `am_history_v10_${r}`;
      const rawHist = localStorage.getItem(histKey);
      const hist: any[] = rawHist ? JSON.parse(rawHist) : [];
      if (!hist.some((m: any) => String(m.id) === String(msg.id))) {
        hist.push(msg);
        localStorage.setItem(histKey, JSON.stringify(hist));
        localStorage.setItem(`am_chat_history_v10_${r}`, JSON.stringify(hist));
      }
    });
  } catch (_) {}

  // 8. SINKRONKAN PREVIEW TEKS KONTAK DI SISI PENERIMA (SUPER ADMIN / PENJUAL)
  const incomingSenderId = String(rawSenderId || '').toLowerCase().trim();
  const incomingSenderNorm = senderNorm;
  const formattedMsgTime = msgTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const contactToUpdate = contacts.value.find((c: any) => {
    const cId = String(c.id || '').toLowerCase().trim();
    const cPartnerId = String(c.partner_id || '').toLowerCase().trim();
    const cNorm = normalizeUserId(c.id || c.partner_id || c.email);
    return (
      cId === incomingSenderId ||
      cPartnerId === incomingSenderId ||
      (incomingSenderNorm && cNorm === incomingSenderNorm)
    );
  });

  if (contactToUpdate) {
    contactToUpdate.lastMessage = msgText;
    contactToUpdate.last_message = msgText;
    contactToUpdate.lastMessageTime = formattedMsgTime;
    contactToUpdate.time = formattedMsgTime;
    contactToUpdate._lastMsgTimestamp = new Date(msgTimestamp).getTime();
    contacts.value = [contactToUpdate, ...contacts.value.filter((c: any) => c !== contactToUpdate)];
  } else if (rawSenderId) {
    const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
    const myEmail = String(currentUser.value?.email || '').toLowerCase().trim();
    const myName = String(currentUser.value?.name || props.currentUserName || '').toLowerCase().trim();
    const myRole = String(currentUser.value?.role || '').toLowerCase().trim();

    const newContactObj = {
      id: rawSenderId,
      partner_id: rawSenderId,
      partner_email: rawMsg.senderEmail || `${rawSenderId}@campusmart.ac.id`,
      name: rawMsg.senderName || rawMsg.sender_name || 'Pengguna Kampus',
      role: rawMsg.senderRole || rawMsg.sender_role || 'buyer',
      avatar: rawMsg.senderAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${rawSenderId}`,
      lastMessage: msgText,
      last_message: msgText,
      lastMessageTime: formattedMsgTime,
      time: formattedMsgTime,
      _lastMsgTimestamp: new Date(msgTimestamp).getTime()
    };
    if (!isSelfUser(newContactObj, myId, myEmail, myName, myRole)) {
      contacts.value = [newContactObj, ...contacts.value];
    }
  }

  // Juga jalankan updateContactLastMessage untuk ketahanan ganda
  const contactKeyToUpdate = rawSenderId || (activePartner ? activePartner.id : '');
  updateContactLastMessage(contactKeyToUpdate, msgText, msgTimestamp, rawReceiverId);
};

const handleInputWithTyping = (e: Event) => {
  pesanTeks.value = (e.target as HTMLInputElement).value;
  handleTypingInput();
};

/**
 * 📡 Langganan Channel Room Soketi Deterministik (Singleton per Room)
 * const channelName = `chat-room-${getDeterministicRoomId(currentUserId, partnerId)}`;
 */
let activeSubscribedRoomKey: string | null = null;

const setupSoketiRoomSubscription = () => {
  const idA = getNormalizedId(currentUser.value);
  const activePartner = selectedChat.value || defaultPartner.value;
  const idB = getNormalizedId(activePartner);
  if (!idA || !idB) return;

  const roomKey = getRoomId(idA, idB);
  const channelName = `chat-room-${roomKey}`;

  // 🛡️ Jangan putus koneksi jika masih berada di room yang sama persis
  if (activeSubscribedRoomKey === roomKey && activeSoketiUnsub) {
    return;
  }

  if (activeSoketiUnsub) {
    try { activeSoketiUnsub(); } catch (_e) {}
    activeSoketiUnsub = null;
  }
  activeSubscribedRoomKey = roomKey;
  console.log('[CHAT DEBUG] Connected to room:', channelName);

  activeSoketiUnsub = subscribeToSoketiRoom(idA, idB, {
    onNewMessage: (incomingMsg) => {
      console.log('[CHAT DEBUG] New message received:', incomingMsg);
      handleIncomingMessage(incomingMsg);
    },
    onMessageUpdated: (data) => {
      console.log('[CHAT DEBUG] Message updated received:', data);
      handleIncomingMessageUpdated(data);
    },
    onMessageDeleted: (data) => {
      console.log('[CHAT DEBUG] Message deleted received:', data);
      handleIncomingMessageDeleted(data);
    },
    onReactionAdded: (data) => {
      handleIncomingReactionAdded(data);
    },
    onTyping: (data) => {
      const pId = String(idB);
      isPartnerTyping.value = Boolean(data.isTyping);
      partnerTypingName.value = data.userName || activePartnerName.value;
      typingContacts.value = {
        ...typingContacts.value,
        [pId]: Boolean(data.isTyping)
      };

      if (partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
      if (data.isTyping) {
        partnerTypingTimeout = setTimeout(() => {
          isPartnerTyping.value = false;
          const next = { ...typingContacts.value };
          delete next[pId];
          typingContacts.value = next;
        }, 3000);
      }
    }
  });
};

/**
 * 📡 PENANGAN WEBSOCKET / ECHO / SOKETI REAL-TIME (LAPTOP <-> HP)
 * Mendengarkan channel chat room aktif dan channel global secara serentak
 * Menangkap variasi nama event: NewMessage, .NewMessage, client-message-sent, .client-message-sent, new-message, dll.
 */
let activeEchoSubscriptions: any[] = [];

const setupEchoChatListeners = () => {
  if (typeof window === 'undefined') return;
  const echo = (window as any).Echo || getEcho();
  const pusher = getPusherClient();

  // Bersihkan subscription sebelumnya sebelum pasang baru
  if (activeEchoSubscriptions.length > 0) {
    activeEchoSubscriptions.forEach(unsub => {
      try { unsub(); } catch (_) {}
    });
    activeEchoSubscriptions = [];
  }

  if (!echo && !pusher) return;

  const currentRoomKey = activeRoomId.value;
  const targetChannel = echo ? echo.channel(currentRoomKey) : null;
  const dotRoomChannel = echo && currentRoomKey ? echo.channel(`chat.${currentRoomKey}`) : null;
  const globalChannel = echo ? echo.channel('campusmart-chat') : null;
  const globalChatChannel = echo ? echo.channel('campusmart-chat-global') : null;

  const onIncoming = (data: any) => {
    console.log('📱 Pesan masuk di perangkat:', data);
    if (!data) return;
    let payload = data;
    if (typeof data === 'string') {
      try { payload = JSON.parse(data); } catch (_) {}
    }
    if (payload?.data && typeof payload.data === 'object') {
      payload = { ...payload.data, ...payload };
    }

    // Abaikan jika pesan dikirim oleh diri sendiri
    const myId = String(currentUser.value?.id || props.currentUserId || '').toLowerCase().trim();
    const myNorm = normalizeUserId(myId);
    const senderId = String(payload.sender_id || payload.senderId || payload.fromId || '').toLowerCase().trim();
    const senderNorm = normalizeUserId(senderId);

    if (senderId && myId && (senderId === myId || senderNorm === myNorm)) return;

    // Cek apakah pesan cocok untuk room saat ini
    const inRoom = String(payload.room_id || payload.roomId || '');
    const activePartner = selectedChat.value || defaultPartner.value;
    const partnerNorm = normalizeUserId(activePartner?.id || activePartner?.partner_id);

    const isRoomMatch =
      !inRoom ||
      inRoom === currentRoomKey ||
      inRoom === `chat.${currentRoomKey}` ||
      (senderNorm && partnerNorm && senderNorm === partnerNorm);

    if (isRoomMatch) {
      const msgText = String(payload.text || payload.message || payload.content || '').trim();
      if (msgText) {
        const rawTime = payload.time || formatTime(payload.timestamp || payload.created_at || payload.createdAt || new Date().toISOString());
        const newMsg = {
          id: payload.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          roomId: currentRoomKey,
          room_id: currentRoomKey,
          sender_id: payload.sender_id || payload.senderId || senderId,
          senderId: payload.sender_id || payload.senderId || senderId,
          sender_name: payload.sender_name || payload.senderName || activePartnerName.value || 'Lawan Bicara',
          senderName: payload.sender_name || payload.senderName || activePartnerName.value || 'Lawan Bicara',
          sender_role: payload.sender_role || payload.senderRole || activePartnerRole.value || 'buyer',
          senderRole: payload.sender_role || payload.senderRole || activePartnerRole.value || 'buyer',
          text: msgText,
          content: msgText,
          time: rawTime,
          timestamp: payload.timestamp || payload.created_at || payload.createdAt || new Date().toISOString(),
          created_at: payload.created_at || payload.createdAt || payload.timestamp || new Date().toISOString(),
          createdAt: payload.created_at || payload.createdAt || payload.timestamp || new Date().toISOString(),
          is_self: false,
          isSelf: false,
          is_me: false,
          isMe: false,
          replyTo: payload.replyTo || payload.reply_to || null,
          reply_to: payload.replyTo || payload.reply_to || null
        };

        const alreadyExists = messages.value.some((m: any) =>
          String(m.id) === String(newMsg.id) ||
          (m.text === newMsg.text && (m.time === newMsg.time || Math.abs(new Date(m.created_at || m.createdAt || 0).getTime() - new Date(newMsg.timestamp).getTime()) < 3000))
        );

        if (!alreadyExists) {
          messages.value.push(newMsg);
          rawMessagesMap.set(String(newMsg.id), newMsg);
          syncMessagesFromMap();
          triggerNotificationBeepAndToast(newMsg);
          scrollToBottom();
        }
      }
    }

    // Juga teruskan ke handleIncomingMessage untuk sinkronisasi histori kontak dan badge
    handleIncomingMessage(payload);
  };

  // 1. Tangkap semua format event Soketi/Pusher via Echo Channel:
  const channelsList = [targetChannel, dotRoomChannel, globalChannel, globalChatChannel].filter(Boolean);
  channelsList.forEach(chan => {
    try {
      chan.listen('NewMessage', onIncoming);
      chan.listen('.NewMessage', onIncoming);
      chan.listen('client-message-sent', onIncoming);
      chan.listen('.client-message-sent', onIncoming);
      chan.listen('new-message', onIncoming);
      chan.listen('.new-message', onIncoming);
      chan.listen('client-new-message', onIncoming);
      chan.listen('.client-new-message', onIncoming);
      chan.listen('chat_message', onIncoming);
      chan.listen('.chat_message', onIncoming);
      chan.listenForWhisper?.('NewMessage', onIncoming);
      chan.listenForWhisper?.('new-message', onIncoming);
      chan.listenForWhisper?.('client-message-sent', onIncoming);
    } catch (_) {}
  });

  // 2. Tangkap juga via Native Pusher Client untuk redundansi total:
  if (pusher) {
    const rawChannels = Array.from(new Set([
      currentRoomKey,
      `chat.${currentRoomKey}`,
      'campusmart-chat',
      'campusmart-chat-global'
    ].filter(Boolean)));

    rawChannels.forEach(cn => {
      try {
        const pChan = pusher.subscribe(cn);
        pChan.bind('NewMessage', onIncoming);
        pChan.bind('.NewMessage', onIncoming);
        pChan.bind('client-message-sent', onIncoming);
        pChan.bind('.client-message-sent', onIncoming);
        pChan.bind('new-message', onIncoming);
        pChan.bind('.new-message', onIncoming);
        pChan.bind('client-new-message', onIncoming);
        pChan.bind('chat_message', onIncoming);

        activeEchoSubscriptions.push(() => {
          try {
            pChan.unbind('NewMessage', onIncoming);
            pChan.unbind('.NewMessage', onIncoming);
            pChan.unbind('client-message-sent', onIncoming);
            pChan.unbind('.client-message-sent', onIncoming);
            pChan.unbind('new-message', onIncoming);
            pChan.unbind('.new-message', onIncoming);
            pChan.unbind('client-new-message', onIncoming);
            pChan.unbind('chat_message', onIncoming);
            pusher.unsubscribe(cn);
          } catch (_) {}
        });
      } catch (_) {}
    });
  }
};

// ==========================================
// 🤖 LOGIKA BALASAN AI OTOMATIS (AI AUTO-RESPONDER TOKO)
// ==========================================
let aiReplyTimeout: any = null;
let lastAiTriggerTime = 0;

const triggerSellerAIReply = (buyerMessageText: string) => {
  // 🛡️ Mencegah Bot Auto-Reply Terpanggil Ganda:
  // Nonaktifkan pemicu AI bot otomatis jika room chat dibuka antar akun pengguna nyata.
  // Bot hanya boleh merespons jika lawan bicara adalah akun official bot AI (`bot`, `ai_agent`, atau role `ai`).
  const partnerIdStr = String((activeRoom.value as any)?.partner_id || (activeRoom.value as any)?.otherId || selectedChat.value?.partner_id || selectedChat.value?.id || '').toLowerCase();
  const partnerRoleStr = String((activeRoom.value as any)?.partner_role || (activeRoom.value as any)?.otherRole || selectedChat.value?.role || '').toLowerCase();
  const isAiPartner = partnerIdStr.includes('bot') || partnerIdStr.includes('ai_') || partnerIdStr === 'ai' || partnerRoleStr === 'ai';
  if (!isAiPartner) return;

  // Jangan balas otomatis jika pengirim pesan adalah diri sendiri yang sedang login sebagai Penjual
  if (currentUser.value?.role === 'seller') return;
  // Cegah burst spam / double trigger dalam rentang waktu 5 detik
  if (Date.now() - lastAiTriggerTime < 5000) return;
  lastAiTriggerTime = Date.now();

  clearTimeout(aiReplyTimeout);
  aiReplyTimeout = setTimeout(async () => {
    // Buat respons dinamis AI Toko
    const botReplies = [
      `Hai Kak ${currentUser.value?.name || 'Pelanggan'}! 🌸 Terima kasih sudah chat. Pesan "${buyerMessageText}" sudah kami terima ya! Ada yang ingin ditanyakan terkait ketersediaan stok atau pengiriman? 🥰`,
      `Halo Kak! Produk kami siap dipesan yaa ✨ Mau sekalian dibungkus rapi atau ada catatan khusus?`,
      `Siap Kak! Untuk pesanan dan detail produk bisa langsung kami siapkan. Ditunggu konfirmasinya yaa! 🛍️`
    ];
    const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];

    const targetPartnerId = (activeRoom.value as any)?.partner_id || (activeRoom.value as any)?.otherId || selectedChat.value?.partner_id || selectedChat.value?.id || 'ai_support';
    const targetPartnerName = (activeRoom.value as any)?.partner_name || (activeRoom.value as any)?.otherName || selectedChat.value?.name || 'Asisten Toko';
    const targetRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || getRoomId(currentUser.value?.id || 'guest', String(targetPartnerId));

    const aiPayload: ChatMessage = {
      id: 'msg_ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      room_id: targetRoomId,
      roomId: targetRoomId,
      sender_id: targetPartnerId,
      senderId: targetPartnerId,
      sender_name: targetPartnerName,
      senderName: targetPartnerName,
      sender_role: 'seller',
      senderRole: 'seller',
      receiver_id: currentUser.value?.id || 'guest_user',
      receiverId: currentUser.value?.id || 'guest_user',
      receiver_name: currentUser.value?.name || 'Pengguna Kampus',
      receiverName: currentUser.value?.name || 'Pengguna Kampus',
      receiver_role: 'buyer',
      receiverRole: 'buyer',
      is_ai: true,
      isAi: true,
      is_self: false,
      isSelf: false,
      text: randomReply,
      content: randomReply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Tampilkan di layar lokal dengan proteksi deduplikasi
    appendMessageSafe(aiPayload);

    // 🔔 Notifikasi real-time seketika untuk balasan AI / Penjual (anti-loop & anti-toast jika obrolan sedang dibuka)
    triggerNotificationBeepAndToast(aiPayload);

    // Siarkan ke Upstash Redis Cloud Sync & WebSocket agar sinkron ke perangkat lain
    if (typeof pushCloudChatMessage === 'function') {
      try {
        await pushCloudChatMessage(aiPayload as any);
      } catch (_e) {}
    }
    try {
      const globalSocket = typeof window !== 'undefined' ? (window as any).socket : undefined;
      if (globalSocket && globalSocket.emit) {
        globalSocket.emit('chat_message', aiPayload);
      }
      sendSocketMessage({
        roomId: String(targetRoomId),
        senderId: String(targetPartnerId),
        senderName: String(targetPartnerName),
        senderRole: 'seller',
        receiverId: currentUser.value?.id || 'guest_user',
        receiverName: currentUser.value?.name || 'Pengguna Kampus',
        text: randomReply,
        time: aiPayload.time,
        createdAt: aiPayload.created_at
      } as any);
    } catch (_e) {}
  }, 2500); // Jeda natural 2.5 detik seolah AI mengetik
};

// ==========================================
// ✉️ FUNGSI UTAMA PENGIRIMAN PESAN (MANUAL FORM SUBMIT & ENTER KEY)
// ==========================================
let isSendingMessage = false;

const handleKirimPesan = () => {
  if (isSendingMessage) return;

  if (!isChatAuthorized.value) {
    alert(chatRestrictionMessage.value || 'Otorisasi peran tidak mengizinkan pengiriman pesan untuk status pesanan saat ini.');
    return;
  }

  // Ambil teks baik dari reactive state pesanTeks ataupun langsung dari DOM ref
  const textFromDom = (inputFieldRef.value?.value || nativeInputRef.value?.value || '').trim();
  const textFromState = (pesanTeks.value || '').trim();
  const textToSend = textFromState || textFromDom;
  if (!textToSend) return;

  isSendingMessage = true;
  setTimeout(() => {
    isSendingMessage = false;
  }, 350);

  let myId = currentUser.value?.id || 'guest_user';
  const myNorm = normalizeUserId(myId);
  if (myNorm === 'admin_nurmiyaty') myId = 'admin_nurmiyaty';
  if (myNorm === 'coop_koperasi') myId = 'coop_koperasi';

  const activePartner = selectedChat.value || defaultPartner.value;
  let partnerId = activePartner?.id || activePartner?.partner_id || (myId === 'admin_nurmiyaty' ? 'coop_koperasi' : 'admin_nurmiyaty');

  if (
    String(partnerId).toLowerCase().includes('admin') ||
    String(partnerId).toLowerCase().includes('nurmiyaty') ||
    String(activePartner?.name || '').toLowerCase().includes('admin') ||
    String(activePartner?.name || '').toLowerCase().includes('nurmiyaty')
  ) {
    partnerId = 'admin_nurmiyaty';
  }

  // 🎯 STANDARISASI NAMA CHANNEL & ROOM DETERMINISTIK:
  let currentRoomId = getRoomId(myId, partnerId);

  const partnerName = activePartnerName.value || activePartner?.name || 'Lawan Bicara';
  const partnerRole = activePartnerRole.value || activePartner?.role || 'buyer';
  const myName = currentUser.value?.name || (myId === 'admin_nurmiyaty' ? 'Nurmiyaty (Super Admin)' : myId === 'coop_koperasi' ? 'Admin Koperasi' : 'Pengguna Kampus');
  const myRole = currentUser.value?.role || (myId === 'admin_nurmiyaty' ? 'superadmin' : myId === 'coop_koperasi' ? 'coop_admin' : 'buyer');

  const replyPayload = replyingToMessage.value ? {
    id: replyingToMessage.value.id,
    senderName: replyingToMessage.value.senderName || replyingToMessage.value.sender_name || 'Pengguna',
    sender_name: replyingToMessage.value.senderName || replyingToMessage.value.sender_name || 'Pengguna',
    text: (replyingToMessage.value.text || replyingToMessage.value.content || '').slice(0, 120),
    content: (replyingToMessage.value.text || replyingToMessage.value.content || '').slice(0, 120)
  } : null;

  const payload: ChatMessage = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    room_id: currentRoomId,
    roomId: currentRoomId,
    sender_id: myId,
    senderId: myId,
    sender_name: myName,
    senderName: myName,
    sender_role: myRole,
    senderRole: myRole,
    receiver_id: String(partnerId),
    receiverId: String(partnerId),
    receiver_name: partnerName,
    receiverName: partnerName,
    receiver_role: partnerRole,
    receiverRole: partnerRole,
    text: textToSend,
    content: textToSend,
    replyTo: replyPayload,
    reply_to: replyPayload,
    is_me: true,
    isMe: true,
    is_self: true,
    isSelf: true,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // 1. Tampilkan pesan ke riwayat chat lokal (kanan / hijau) dengan proteksi anti-dobel ketat
  appendMessageSafe(payload);

  // 1.5 SINKRONKAN PREVIEW TEKS KONTAK DI SISI PENGIRIM & bawa ke urutan paling atas
  const partnerToUpdate = contacts.value.find((c: any) => {
    const cId = String(c.id || '').toLowerCase().trim();
    const cPartnerId = String(c.partner_id || '').toLowerCase().trim();
    const pId = String(partnerId || '').toLowerCase().trim();
    const pNorm = normalizeUserId(partnerId);
    const cNorm = normalizeUserId(c.id || c.partner_id || c.email);
    return cId === pId || cPartnerId === pId || (pNorm && cNorm === pNorm);
  });
  if (partnerToUpdate) {
    partnerToUpdate.lastMessage = textToSend;
    partnerToUpdate.last_message = textToSend;
    partnerToUpdate.lastMessageTime = payload.time;
    partnerToUpdate.time = payload.time;
    partnerToUpdate._lastMsgTimestamp = Date.now();
    contacts.value = [partnerToUpdate, ...contacts.value.filter((c: any) => c !== partnerToUpdate)];
  }
  updateContactLastMessage(String(partnerId), textToSend, payload.created_at, myId);

  // 2. Kosongkan kotak input native, state reaktif, dan mode balas
  pesanTeks.value = '';
  replyingToMessage.value = null;
  if (inputFieldRef.value) inputFieldRef.value.value = '';
  if (nativeInputRef.value) nativeInputRef.value.value = '';

  // 3. Fallback instan antar-tab di browser yang sama via localStorage 'am_last_sync_msg'
  try {
    localStorage.setItem('am_last_sync_msg', JSON.stringify({
      ...payload,
      _t: Date.now()
    }));
  } catch (_) {}

  // 3.5 Siarkan via BroadcastChannel lokal instan (langsung tembus antar-tab & antar-window seketika)
  if (chatBroadcastChannel) {
    try {
      chatBroadcastChannel.postMessage(payload);
    } catch (_) {}
  }

  // 4. Siarkan via Echo / Soketi ke semua channel (termasuk campusmart-chat dan room channel)
  if (typeof window !== 'undefined' && (window as any).Echo) {
    try {
      const echo = (window as any).Echo;
      ['campusmart-chat', 'campusmart-chat-global', `chat.${currentRoomId}`, currentRoomId].forEach(ch => {
        try {
          echo.channel(ch).whisper('new-message', payload);
          echo.channel(ch).whisper('client-message-sent', payload);
        } catch (_) {}
      });
    } catch (_) {}
  }

  // 4.5 Siarkan via socket emitter & HTTP event yang aktif
  broadcastMessageToSoketi(payload);

  // Hentikan status mengetik
  try {
    broadcastSoketiAction(myId, partnerId, 'typing', {
      roomId: currentRoomId,
      userId: myId,
      userName: myName,
      isTyping: false
    });
  } catch (_e) {}

  // 5. Siarkan ke Upstash Redis Cloud Sync (SafeChatSyncHub otomatis mengelola broadcast)
  if (typeof pushCloudChatMessage === 'function') {
    try {
      pushCloudChatMessage(payload as any);
    } catch (_e) {}
  } else {
    try {
      sendCloudChat({
        id: payload.id,
        fromId: myId,
        fromName: myName,
        fromRole: myRole,
        fromAvatar: currentUser.value.avatar,
        toId: String(partnerId),
        toName: partnerName,
        toRole: partnerRole,
        toAvatar: activePartnerAvatar.value,
        text: textToSend,
        replyTo: replyPayload,
        reply_to: replyPayload
      });
    } catch (_e) {}
  }

  console.log('[CHAT DEBUG] Message sent:', payload);

  // 6. Direct HTTP Broadcast Fallback ke Soketi Bridge (Port 6001 & 3000)
  try {
    const sRoom = `chat-room-${currentRoomId}`;
    broadcastChatHttp(payload, [
      sRoom,
      'campusmart-chat',
      'campusmart-chat-global',
      `chat.${currentRoomId}`,
      currentRoomId
    ]);
  } catch (_e) {}

  // 7. Siarkan ke WebSocket FrankenPHP jika tersambung
  try {
    if (typeof (window as any).socket !== 'undefined' && (window as any).socket?.emit) {
      (window as any).socket.emit('chat_message', payload);
    }
    sendSocketMessage({
      roomId: String(currentRoomId),
      senderId: myId,
      senderName: myName,
      senderRole: myRole,
      receiverId: String(partnerId),
      receiverName: partnerName,
      text: textToSend,
      time: payload.time,
      createdAt: payload.created_at,
      replyTo: replyPayload,
      reply_to: replyPayload
    } as any);
  } catch (_e) {}

  // 5. Callback ke host React ChatPage (onSendMessage)
  try {
    if (props.onSendMessage) {
      props.onSendMessage(textToSend);
    } else {
      emit('send-message', textToSend);
    }
  } catch (_e) {}

  // 7. Pemicu balasan AI Otomatis Toko (hanya jika mode standalone Vue, bukan dibungkus host React)
  if (currentUser.value?.role !== 'seller' && !props.onSendMessage) {
    triggerSellerAIReply(textToSend);
  }
};

// Alias untuk backward compatibility
const handleNativeSend = handleKirimPesan;
const kirimPesan = handleKirimPesan;
const sendMessage = handleKirimPesan;
const handleSendMessage = handleKirimPesan;
const kirimPesanOtomatis = (text: string) => {
  pesanTeks.value = text;
  handleKirimPesan();
};

// 🔄 Watch props messages & roomId
watch(
  () => props.messages,
  (newMsgs) => {
    if (!newMsgs || newMsgs.length === 0) return;
    markExistingAsNotified(newMsgs);
    newMsgs.forEach(m => appendMessageSafe(m));
    scrollToBottom();
  },
  { immediate: true, deep: true }
);

watch(
  () => props.roomId,
  (newRoomId) => {
    if (newRoomId) {
      selectedChat.value = {
        id: newRoomId,
        partner_id: newRoomId,
        partner_email: newRoomId,
        name: props.activeRoomName || 'Lawan Bicara',
        role: props.activeRoomRole || 'seller',
        avatar: props.activeRoomAvatar
      };
      rawMessagesMap.clear();
      messages.value = [];
      if (props.messages) {
        markExistingAsNotified(props.messages);
        props.messages.forEach(m => appendMessageSafe(m));
      }
      loadChatHistory();
      setupSoketiRoomSubscription();
      setupEchoChatListeners();
      scrollToBottom();
    }
  }
);

watch(
  () => activeRoomId.value,
  (newRoom) => {
    if (newRoom) {
      setupEchoChatListeners();
    }
  }
);

onMounted(() => {
  // 🧹 1. Pastikan listener lama dicopot total sebelum pasang listener baru (Mencegah Double Listener)
  if (activeUnsubStream) {
    try { activeUnsubStream(); } catch (_e) {}
    activeUnsubStream = null;
  }
  if (activePartnerTypingHandler) {
    window.removeEventListener('am_user_typing', activePartnerTypingHandler);
    activePartnerTypingHandler = null;
  }
  if (activePartnerStopTypingHandler) {
    window.removeEventListener('am_user_stop_typing', activePartnerStopTypingHandler);
    activePartnerStopTypingHandler = null;
  }
  if (activeIncomingReactionHandler) {
    window.removeEventListener('am_chat_reaction', activeIncomingReactionHandler);
    activeIncomingReactionHandler = null;
  }
  if (activeIncomingUpdatedHandler) {
    window.removeEventListener('am_message_updated', activeIncomingUpdatedHandler);
    activeIncomingUpdatedHandler = null;
  }
  if (activeIncomingDeletedHandler) {
    window.removeEventListener('am_message_deleted', activeIncomingDeletedHandler);
    activeIncomingDeletedHandler = null;
  }
  if (activeReactionBc) {
    try { activeReactionBc.close(); } catch (_e) {}
    activeReactionBc = null;
  }
  if (activeSoketiUnsub) {
    try { activeSoketiUnsub(); } catch (_e) {}
    activeSoketiUnsub = null;
  }

  // Minta izin Web Push Notification browser secara proaktif
  try {
    requestBrowserNotificationPermission().catch(() => {});
  } catch (_e) {}

  if (props.messages && props.messages.length > 0) {
    markExistingAsNotified(props.messages);
    props.messages.forEach(m => appendMessageSafe(m));
  }

  // 🛡️ NATIVE TOUCH LISTENER (PAKSA FOKUS + BLOKIR EVENT PROPAGASI NAIK):
  const inputEl = document.getElementById('mobile_chat_input') as HTMLInputElement | null
    || nativeInputRef.value;
  if (inputEl) {
    // Stopkan propagasi di level elemen agar listener global tidak mematikan keyboard
    inputEl.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      inputEl.focus();
    }, { passive: true });
    inputEl.addEventListener('touchend', (e) => {
      e.stopPropagation();
    }, { passive: true });
    inputEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
    inputEl.addEventListener('click', (e) => {
      e.stopPropagation();
      inputEl.focus();
    });

    // ⏳ TYPING INDICATOR: emit saat user mengetik (AMAN — tidak menyentuh reactive state)
    inputEl.addEventListener('input', () => {
      const myNormId = getNormalizedId(currentUser.value);
      const activePartner = selectedChat.value || defaultPartner.value;
      const partnerNormId = getNormalizedId(activePartner);
      const roomId = String(activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'room_default');
      const typingPayload = {
        roomId,
        userId: myNormId || currentUser.value.id,
        userName: currentUser.value.name,
        isTyping: true
      };

      // 1. Broadcast ke Soketi / Pusher Real-Time
      try {
        broadcastSoketiAction(myNormId, partnerNormId, 'typing', typingPayload);
      } catch (_e) {}

      // 2. Broadcast via Socket.IO
      try { sendSocketMessage({ ...typingPayload, type: 'typing' } as any); } catch (_e) {}

      // 3. BroadcastChannel cross-tab
      try {
        const bc = new BroadcastChannel('am_campus_chat_channel_v4');
        bc.postMessage({ type: 'typing', clientId: CLIENT_INSTANCE_ID, data: typingPayload });
        bc.close();
      } catch (_e) {}

      // Stop typing setelah 2 detik tidak mengetik
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        try {
          broadcastSoketiAction(myNormId, partnerNormId, 'typing', { ...typingPayload, isTyping: false });
        } catch (_e) {}
        try {
          const bc2 = new BroadcastChannel('am_campus_chat_channel_v4');
          bc2.postMessage({ type: 'typing', clientId: CLIENT_INSTANCE_ID, data: { ...typingPayload, isTyping: false } });
          bc2.close();
        } catch (_e) {}
      }, 2000);
    });
  }

  // Blokir juga di level footer agar event tidak tembus ke container scroll
  const footerEl = inputEl?.closest('footer');
  if (footerEl) {
    footerEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    footerEl.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
    footerEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  // 💬 TYPING: dengarkan event typing dari lawan bicara (via BroadcastChannel / window event)
  const onPartnerTyping = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail) return;
    // Hanya tampilkan jika dari partner di room aktif
    const roomId = String(props.roomId || selectedChat.value?.id || '');
    if (roomId && detail.roomId && detail.roomId !== roomId) return;
    if (detail.userId === currentUser.value.id) return; // Jangan tampilkan typing diri sendiri
    isPartnerTyping.value = true;
    if (partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
    partnerTypingTimeout = setTimeout(() => { isPartnerTyping.value = false; }, 3000);
  };
  const onPartnerStopTyping = () => { isPartnerTyping.value = false; };
  window.addEventListener('am_user_typing', onPartnerTyping);
  window.addEventListener('am_user_stop_typing', onPartnerStopTyping);
  activePartnerTypingHandler = onPartnerTyping;
  activePartnerStopTypingHandler = onPartnerStopTyping;

  // Listener stream pesan masuk
  const unsubStream = subscribeToCloudChatStream(
    () => currentUser.value.id,
    (incomingMsg) => {
      if (!incomingMsg || !incomingMsg.text) return;
      handleIncomingMessage(incomingMsg);

      const isMine = isSelf(incomingMsg);
      if (!isMine) {
        const senderNorm = normalizeUserId(incomingMsg.senderId || '');

        // 🤖 AUTO-PILOT: balas otomatis jika isAiMode aktif & user adalah Penjual
        if (isAiMode.value && (currentUser.value.role === 'seller' || currentUser.value.role === 'superadmin')) {
          if (aiAutoReplyTimer) clearTimeout(aiAutoReplyTimer);
          aiAutoReplyTimer = setTimeout(() => {
            const replyText = getAiReply(incomingMsg.text || '');
            const contact = contactsList.value.find(c => normalizeUserId(String(c.id)) === senderNorm);
            broadcastAiReply(
              replyText,
              incomingMsg.senderId || senderNorm,
              incomingMsg.senderName || 'Pembeli',
              incomingMsg.senderRole || 'buyer',
              contact?.avatar
            );
          }, 5000); // Auto-reply setelah 5 detik
        }
      }
    }
  );
  activeUnsubStream = unsubStream;

  // ❤️ SINKRONISASI REAKSI PESAN REAL-TIME
  const onIncomingReaction = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail || !detail.msgId || !detail.emoji) return;
    const uId = detail.userId || (detail as any).senderId || (detail as any).user_id;
    const mode = detail.action === 'remove' ? 'remove' : 'add';
    applyLocalReaction(detail.msgId, detail.emoji, uId, mode);
  };
  window.addEventListener('am_chat_reaction', onIncomingReaction);
  activeIncomingReactionHandler = onIncomingReaction;

  // BroadcastChannel untuk reaksi pesan antar tab
  let reactionBc: BroadcastChannel | null = null;
  try {
    reactionBc = new BroadcastChannel('am_campus_chat_channel_v4');
    reactionBc.onmessage = (event) => {
      if (event.data?.type === 'reaction' && event.data?.data) {
        const { msgId, emoji, userId, action } = event.data.data;
        if (msgId && emoji) {
          const mode = action === 'remove' ? 'remove' : 'add';
          applyLocalReaction(msgId, emoji, userId, mode);
        }
      }
    };
  } catch (_e) {}
  activeReactionBc = reactionBc;

  // Muat riwayat reaksi offline dari localStorage
  try {
    const rawReactions = localStorage.getItem('am_chat_reactions');
    if (rawReactions) {
      const reactionStore = JSON.parse(rawReactions);
      const cleanRoom = String(activeRoom.value?.id || props.roomId || 'global').toLowerCase().trim();
      messages.value.forEach(m => {
        if (m.id != null) {
          const key = `${cleanRoom}_${m.id}`;
          if (reactionStore[key]) {
            m.reactions = mergeReactions(m.reactions, reactionStore[key]);
          }
        }
      });
    }
  } catch (_e) {}

  // Muat riwayat pesan room (< 24 jam) saat komponen di-mount
  loadChatHistory();
  // Inisialisasi status pesan terakhir pada daftar kontak dari histori lokal
  initContactsFromLocalHistory();

  // 🔄 Periodic Background Sync dari Redis setiap 2.5s (Menjamin sinkronisasi real-time antar perangkat)
  if (activePollInterval) {
    clearInterval(activePollInterval);
    activePollInterval = null;
  }
  activePollInterval = setInterval(async () => {
    try {
      const myId = currentUser.value?.id;
      if (!myId) return;
      const myNorm = normalizeUserId(myId);
      const res = await fetchCloudChats(myNorm);
      if (res && res.chats && res.chats.length > 0) {
        const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || '';
        const partnerNorm = normalizeUserId(partnerId);
        const targetRoomId = activeRoom.value?.id;

        res.chats.forEach(m => {
          const sNorm = normalizeUserId(m.senderId || (m as any).sender_id);
          const rNorm = normalizeUserId(m.receiverId || (m as any).receiver_id);
          const mRoom = m.roomId || (m as any).room_id || getDeterministicRoomId(sNorm, rNorm);

          const isMatch = mRoom === targetRoomId ||
            mRoom === [myNorm, partnerNorm].sort().join('__') ||
            ((sNorm === myNorm && rNorm === partnerNorm) || (sNorm === partnerNorm && rNorm === myNorm));

          if (isMatch) {
            const added = appendMessageSafe(m);
            if (added && !isSelf(m)) {
              triggerNotificationBeepAndToast(m);
            }
            if (m.text) {
              const pId = isSelf(m) ? (m.receiverId || (m as any).receiver_id) : (m.senderId || (m as any).sender_id);
              updateContactLastMessage(String(pId || partnerId), m.text, m.createdAt || m.created_at);
            }
          }
        });
      }
    } catch (_e) {}
  }, 2500);

  // ⚡ Bergabung ke Room WebSocket & Dengarkan pesan langsung
  try {
    const s = (window as any).socket;
    if (s && s.on) {
      if (activeSocketCleanup) {
        try { activeSocketCleanup(); } catch (_e) {}
        activeSocketCleanup = null;
      }
      s.emit('join_room', activeRoom.value.id);

      const onSocketMsg = (socketPayload: any) => {
        if (!socketPayload || (!socketPayload.text && !socketPayload.content)) return;
        const sNorm = normalizeUserId(socketPayload.sender_id || socketPayload.senderId || socketPayload.fromId);
        const rNorm = normalizeUserId(socketPayload.receiver_id || socketPayload.receiverId || socketPayload.toId);
        const myNorm = normalizeUserId(currentUser.value?.id || '');
        const partnerId = (activeRoom.value as any)?.otherId || selectedChat.value?.partner_id || '';
        const partnerNorm = normalizeUserId(partnerId);
        const targetRoomId = activeRoom.value.id;
        const msgRoom = socketPayload.room_id || socketPayload.roomId || getDeterministicRoomId(sNorm, rNorm);

        if (msgRoom === targetRoomId ||
          ((sNorm === myNorm && rNorm === partnerNorm) || (sNorm === partnerNorm && rNorm === myNorm))
        ) {
          const added = appendMessageSafe(socketPayload);
          if (added && !isSelf(socketPayload)) {
            triggerNotificationBeepAndToast(socketPayload);
          }
          const sText = socketPayload.text || socketPayload.content;
          if (sText) {
            const pId = isSelf(socketPayload) ? (socketPayload.receiver_id || socketPayload.receiverId) : (socketPayload.sender_id || socketPayload.senderId);
            updateContactLastMessage(String(pId || partnerId), sText, socketPayload.createdAt || socketPayload.created_at);
          }
        }
      };

      s.on('chat_message', onSocketMsg);
      activeSocketCleanup = () => {
        try { s.off('chat_message', onSocketMsg); } catch (_e) {}
      };
    }
  } catch (_e) {}

  // 💬 SINKRONISASI UPDATE & HAPUS PESAN REAL-TIME VIA WINDOW EVENT
  const onWindowMsgUpdated = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) handleIncomingMessageUpdated(detail);
  };
  const onWindowMsgDeleted = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) handleIncomingMessageDeleted(detail);
  };
  window.addEventListener('am_message_updated', onWindowMsgUpdated);
  window.addEventListener('am_message_deleted', onWindowMsgDeleted);
  activeIncomingUpdatedHandler = onWindowMsgUpdated;
  activeIncomingDeletedHandler = onWindowMsgDeleted;

  // 🚪 SINKRONISASI BUKA CHAT ROOM / KONTAK LANGSUNG (Misal klik "Buka Chat" dari Notifikasi Super Admin)
  const onOpenChatRoom = (e: Event) => {
    handleOpenChatTarget(e);
  };
  window.addEventListener('am_open_chat_room', onOpenChatRoom);
  activeOpenChatTargetHandler = onOpenChatRoom;
  handleOpenChatTarget();

  // 💾 CROSS-TAB SYNC VIA STORAGE EVENT (CADANGAN INSTAN ANTAR-TAB 100% SINKRON)
  const handleStorageSync = (e: StorageEvent) => {
    if (e.key === 'am_last_sync_msg' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && (data.text || data.content || data.message)) {
          handleIncomingMessage(data);
        }
      } catch (_) {}
    } else if (e.key && (
      e.key.startsWith('am_registered_users') ||
      e.key.startsWith('am_history_') ||
      e.key.startsWith('am_chat_history_') ||
      e.key === 'am_user_session' ||
      e.key === 'campus_user'
    )) {
      initContactsFromLocalHistory();
    }
  };
  window.addEventListener('storage', handleStorageSync);
  activeStorageHandler = handleStorageSync;

  // 📡 BERLANGGANAN GLOBAL CHANNEL DENGAN ECHO & SOKETI WHISPER (campusmart-chat-global)
  const unsubGlobalChat = subscribeToGlobalChat((incomingMsg) => {
    if (!incomingMsg || (!incomingMsg.text && !incomingMsg.content)) return;
    handleIncomingMessage(incomingMsg);
  });
  activeGlobalChatUnsub = unsubGlobalChat;

  // 📡 1. LINTAS-TAB & JALUR LOKAL INSTAN MENGGUNAKAN BroadcastChannel API
  if (chatBroadcastChannel) {
    chatBroadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      const myId = String(currentUser.value?.id || '').toLowerCase();
      const sId = String(data.senderId || data.sender_id || '').toLowerCase();
      if (sId && myId && (sId === myId || normalizeUserId(sId) === normalizeUserId(myId))) return;
      console.log('⚡ Pesan masuk via BroadcastChannel:', data);
      handleIncomingMessage(data);
    };
  }

  // 📡 2. BERLANGGANAN WEBSOCKET / ECHO / SOKETI REAL-TIME (LAPTOP <-> HP)
  setupEchoChatListeners();
  setupSoketiRoomSubscription();

  // 🔄 BERLANGGANAN WEBSOCKET ORDER STATUS REALTIME
  const handleIncomingOrderStatusUpdated = (data: any) => {
    if (!data) return;
    const sysText = data.systemMessage || `Status pesanan #${data.orderId} diperbarui: ${data.newStatus}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const sysMsg = {
      id: `sys_order_${data.orderId}_${Date.now()}`,
      roomId: activeRoom.value?.id || `order_${data.orderId}`,
      sender_id: 'system',
      senderId: 'system',
      sender_name: 'Sistem Campus Mart',
      senderName: 'Sistem Campus Mart',
      sender_role: 'system',
      senderRole: 'system',
      text: sysText,
      content: sysText,
      time: timeStr,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };
    handleIncomingMessage(sysMsg);
  };

  activeOrderStatusHandler = (e: any) => {
    handleIncomingOrderStatusUpdated(e?.detail || e);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('am_order_status_updated', activeOrderStatusHandler);

    try {
      const echo = (window as any).Echo;
      const targetOrderId = props.orderId || (selectedChat.value as any)?.orderId;
      if (echo && typeof echo.channel === 'function') {
        const orderChannelName = targetOrderId ? `order.${targetOrderId}` : 'campusmart-orders';
        const ch = echo.channel(orderChannelName);
        ch.listen?.('order-status-updated', (data: any) => handleIncomingOrderStatusUpdated(data));
        ch.listen?.('.order-status-updated', (data: any) => handleIncomingOrderStatusUpdated(data));
      }
    } catch (_e) {}
  }

  scrollToBottom();
});

let activeOpenChatTargetHandler: ((e: Event) => void) | null = null;

const handleOpenChatTarget = (e?: any) => {
  try {
    const savedContactStr = typeof window !== 'undefined' ? localStorage.getItem('am_target_chat_contact') : null;
    const savedRoomStr = typeof window !== 'undefined' ? localStorage.getItem('am_target_chat_room') : null;
    let target = e?.detail?.contact;
    if (!target && savedContactStr) {
      try { target = JSON.parse(savedContactStr); } catch (_) {}
    }
    const senderId = e?.detail?.senderId;
    const roomId = e?.detail?.roomId || savedRoomStr;

    let foundContact = null;
    if (target) {
      const tNorm = normalizeUserId(target.partner_id || target.id || target.partner_email || target.email || '');
      foundContact = contacts.value.find((c: any) =>
        c.id === target.id ||
        c.partner_id === target.partner_id ||
        (tNorm && (normalizeUserId(c.id) === tNorm || normalizeUserId(c.partner_id) === tNorm || normalizeUserId(c.partner_email) === tNorm)) ||
        (target.name && c.name && c.name.toLowerCase().includes(target.name.toLowerCase()))
      );
      if (!foundContact) {
        foundContact = {
          id: target.id || 'room_superadmin',
          partner_id: target.partner_id || 'usr_nurmiyaty_superadmin',
          partner_email: target.partner_email || 'miyya@gmail.com',
          name: target.name || 'Nurmiyaty (Super Admin)',
          role: target.role || 'superadmin',
          avatar: target.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty',
          lastMessage: target.lastMessage || 'Baru saja',
          lastMessageTime: 'Baru saja',
          time: 'Baru saja',
          unreadCount: 0,
          _lastMsgTimestamp: Date.now()
        };
        contacts.value.unshift(foundContact);
      }
    } else if (senderId || roomId) {
      const sNorm = normalizeUserId(senderId || '');
      foundContact = contacts.value.find((c: any) =>
        (sNorm && (normalizeUserId(c.id) === sNorm || normalizeUserId(c.partner_id) === sNorm || normalizeUserId(c.partner_email) === sNorm)) ||
        (roomId && (c.id === roomId || roomId.includes(c.id)))
      );
      if (!foundContact && (sNorm.includes('admin') || sNorm.includes('nurmiyaty') || sNorm.includes('miyya'))) {
        foundContact = {
          id: 'room_superadmin',
          partner_id: 'usr_nurmiyaty_superadmin',
          partner_email: 'miyya@gmail.com',
          name: 'Nurmiyaty (Super Admin)',
          role: 'superadmin',
          avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty',
          lastMessage: 'Baru saja',
          lastMessageTime: 'Baru saja',
          time: 'Baru saja',
          unreadCount: 0,
          _lastMsgTimestamp: Date.now()
        };
        contacts.value.unshift(foundContact);
      }
    }

    if (foundContact) {
      selectContact(foundContact);
      localStorage.removeItem('am_target_chat_contact');
      localStorage.removeItem('am_target_chat_room');
    }
  } catch (err) {
    console.error('[CampusChatVue] Error opening target contact:', err);
  }
};

onUnmounted(() => {
  // Bersihkan semua listener dan timer saat komponen dihancurkan
  if (typingTimeout) clearTimeout(typingTimeout);
  if (partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
  if (toastTimer) clearTimeout(toastTimer);
  if (aiAutoReplyTimer) clearTimeout(aiAutoReplyTimer);
  if (aiReplyTimeout) clearTimeout(aiReplyTimeout);

  if (activePollInterval) {
    clearInterval(activePollInterval);
    activePollInterval = null;
  }
  if (activeSocketCleanup) {
    try { activeSocketCleanup(); } catch (_e) {}
    activeSocketCleanup = null;
  }

  if (activeUnsubStream) {
    try { activeUnsubStream(); } catch (_e) {}
    activeUnsubStream = null;
  }
  if (activePartnerTypingHandler) {
    window.removeEventListener('am_user_typing', activePartnerTypingHandler);
    activePartnerTypingHandler = null;
  }
  if (activePartnerStopTypingHandler) {
    window.removeEventListener('am_user_stop_typing', activePartnerStopTypingHandler);
    activePartnerStopTypingHandler = null;
  }
  if (activeIncomingReactionHandler) {
    window.removeEventListener('am_chat_reaction', activeIncomingReactionHandler);
    activeIncomingReactionHandler = null;
  }
  if (activeIncomingUpdatedHandler) {
    window.removeEventListener('am_message_updated', activeIncomingUpdatedHandler);
    activeIncomingUpdatedHandler = null;
  }
  if (activeIncomingDeletedHandler) {
    window.removeEventListener('am_message_deleted', activeIncomingDeletedHandler);
    activeIncomingDeletedHandler = null;
  }
  if (activeReactionBc) {
    try { activeReactionBc.close(); } catch (_e) {}
    activeReactionBc = null;
  }
  if (activeSoketiUnsub) {
    try { activeSoketiUnsub(); } catch (_e) {}
    activeSoketiUnsub = null;
  }
  if (activeOpenChatTargetHandler) {
    window.removeEventListener('am_open_chat_room', activeOpenChatTargetHandler);
    activeOpenChatTargetHandler = null;
  }
  if (activeStorageHandler) {
    window.removeEventListener('storage', activeStorageHandler);
    activeStorageHandler = null;
  }
  if (activeGlobalChatUnsub) {
    try { activeGlobalChatUnsub(); } catch (_e) {}
    activeGlobalChatUnsub = null;
  }
  if (activeOrderStatusHandler) {
    window.removeEventListener('am_order_status_updated', activeOrderStatusHandler);
    activeOrderStatusHandler = null;
  }
  if (activeEchoSubscriptions.length > 0) {
    activeEchoSubscriptions.forEach(unsub => {
      try { unsub(); } catch (_) {}
    });
    activeEchoSubscriptions = [];
  }
});
</script>

<style scoped>
textarea, input {
  -webkit-user-select: auto !important;
  user-select: auto !important;
  pointer-events: auto !important;
  touch-action: manipulation !important;
}
.no-scrollbar::-webkit-scrollbar {
  display: none !important;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}
/* TOAST SLIDE TRANSITION */
.toast-slide-enter-active {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-slide-leave-active {
  transition: all 0.2s ease-in;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
</style>
