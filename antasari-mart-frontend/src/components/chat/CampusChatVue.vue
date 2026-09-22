<template>
  <div class="w-full h-[100dvh] max-h-[100dvh] flex flex-col md:flex-row bg-white dark:bg-gray-900 overflow-hidden font-sans">
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
          v-for="contact in filteredContacts"
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
              <span class="text-[10px] text-gray-400 shrink-0">{{ contact.time || 'Online' }}</span>
            </div>
            <div class="flex items-center justify-between gap-1">
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                <span v-if="isContactTyping(contact.id) || isContactTyping(contact.partner_id) || isContactTyping(contact.partner_email) || (selectedChat?.id === contact.id && isPartnerTyping)" class="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse italic">
                  Sedang mengetik...
                </span>
                <span v-else>{{ contact.lastMessage || 'Mulai percakapan...' }}</span>
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
        'flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 h-full max-h-[100dvh] overflow-hidden min-w-0 transition-all duration-200',
        selectedChat ? 'flex w-full h-[100dvh] md:h-full' : 'hidden md:flex'
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
      <div ref="messagesContainerRef" class="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-2 bg-[#efeae2]/50 dark:bg-gray-950">
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 py-12">
          <span class="text-4xl mb-2">💬</span>
          <p class="font-bold text-sm text-gray-700 dark:text-gray-300">Belum ada percakapan</p>
          <p class="text-xs text-gray-500">Ketik pesan di bawah untuk mulai mengobrol.</p>
        </div>

      <!-- 💬 BUBBLE CHAT DENGAN ATURAN POSISI PASTI -->
        <template v-for="(msg, idx) in messages" :key="msg.id || idx">
          <div 
            :class="['flex w-full my-1.5 px-2 sm:px-3', isMyMessage(msg) ? 'justify-end' : 'justify-start']"
          >
            <!-- Avatar hanya tampil jika BUKAN pesan sendiri (KIRI) -->
            <div v-if="!isMyMessage(msg)" class="w-8 h-8 rounded-full mr-2 shrink-0 overflow-hidden shadow-xs mt-1">
              <img :src="activePartnerAvatar" class="w-full h-full object-cover" />
            </div>

            <!-- Bubble Box -->
            <div 
              :class="[
                'max-w-[78%] sm:max-w-[70%] p-3 rounded-2xl text-sm shadow-xs break-words relative group',
                isMyMessage(msg) 
                  ? 'bg-emerald-600 text-white rounded-br-xs' 
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-xs border border-gray-100 dark:border-gray-700'
              ]"
            >
              <!-- Nama Pengirim (Hanya untuk KIRI / Lawan Bicara) -->
              <div v-if="!isMyMessage(msg)" class="flex items-center gap-1.5 mb-1 pb-1 border-b border-gray-100 dark:border-gray-700/60">
                <!-- Avatar AI berbeda -->
                <span v-if="isAiMessage(msg)" class="text-sm">🤖</span>
                <span class="font-bold text-xs" :class="isAiMessage(msg) ? 'text-violet-700 dark:text-violet-400' : 'text-gray-900 dark:text-gray-100'">
                  {{ msg.senderName || msg.sender_name || activePartnerName }}
                </span>
                <span :class="['text-[8.5px] font-bold px-1.5 py-0.2 rounded border', getRoleBadge(msg.senderRole || msg.sender_role || activePartnerRole).bgClass]">
                  {{ getRoleBadge(msg.senderRole || msg.sender_role || activePartnerRole).shortLabel }}
                </span>
              </div>

              <!-- ↩️ QUOTE PREVIEW PESAN YANG DIBALAS (Tampil identik di kedua layar: Pengirim & Penerima) -->
              <div
                v-if="!(msg.is_deleted || msg.isDeleted) && (msg.replyTo || msg.reply_to)"
                :class="[
                  'mb-1.5 p-2 rounded-lg text-xs border-l-4 transition flex flex-col gap-0.5 select-none shadow-2xs',
                  isMyMessage(msg)
                    ? 'bg-black/15 text-emerald-100 border-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border-emerald-500'
                ]"
              >
                <span class="font-bold text-[10.5px] opacity-90">
                  {{ (msg.replyTo?.senderName || msg.replyTo?.sender_name || msg.reply_to?.senderName || msg.reply_to?.sender_name) || 'Pesan' }}
                </span>
                <span class="truncate text-[11px] opacity-85 italic">
                  {{ (msg.replyTo?.text || msg.replyTo?.content || msg.reply_to?.text || msg.reply_to?.content) || '...' }}
                </span>
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
              <div v-else-if="editingMessageId === msg.id" class="mt-1 flex flex-col gap-1.5 min-w-[200px]">
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

              <!-- ❤️ 👍 😂 😮 😢 🙏 TAMPILAN REAKSI EMOJI AKTIF -->
              <div v-if="msg.reactions && Object.keys(msg.reactions).length > 0" class="flex flex-wrap gap-1 mt-1.5">
                <button
                  v-for="(count, emoji) in msg.reactions"
                  :key="emoji"
                  v-show="Number(count) > 0"
                  type="button"
                  @click="handleReactToMessage(msg.id, String(emoji))"
                  :class="[
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer',
                    isMyMessage(msg)
                      ? 'bg-emerald-700/70 text-emerald-100 border border-emerald-500/40 hover:bg-emerald-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  ]"
                  :title="'Reaksi ' + emoji + ': ' + count"
                >
                  <span>{{ emoji }}</span>
                  <span class="text-[10px]">{{ count }}</span>
                </button>
              </div>

              <!-- FOOTER BUBBLE: TOMBOL REAKSI CEPAT, BALAS, AKSI EDIT/HAPUS & JAM -->
              <div class="flex items-center justify-between mt-1 pt-0.5 gap-2">
                <!-- Tombol Beri Reaksi Cepat (6 Emoji Populer) -->
                <div v-if="!(msg.is_deleted || msg.isDeleted)" class="flex items-center gap-1 opacity-75 hover:opacity-100 transition">
                  <button
                    v-for="emo in ['❤️', '👍', '😂', '😮', '😢', '🙏']"
                    :key="emo"
                    type="button"
                    @click="handleReactToMessage(msg.id, emo)"
                    class="text-xs hover:scale-130 active:scale-95 transition-transform p-0.5 cursor-pointer leading-none"
                    :title="'Beri reaksi ' + emo"
                  >
                    {{ emo }}
                  </button>
                </div>
                <div v-else></div>

                <!-- AKSI BALAS, EDIT & HAPUS -->
                <div class="flex items-center gap-1.5">
                  <!-- Tombol Balas (↩️) untuk semua pesan yang aktif -->
                  <button
                    v-if="!(msg.is_deleted || msg.isDeleted)"
                    type="button"
                    @click="startReplyMessage(msg)"
                    :class="[
                      'text-xs px-1 py-0.5 rounded transition cursor-pointer',
                      isMyMessage(msg)
                        ? 'hover:bg-emerald-700/60 text-emerald-100'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                    ]"
                    title="Balas pesan ini"
                  >
                    ↩️
                  </button>

                  <!-- Aksi Edit & Hapus (Khusus pesan pengirim sendiri) -->
                  <div v-if="isMyMessage(msg) && !(msg.is_deleted || msg.isDeleted)" class="flex items-center gap-1 opacity-60 hover:opacity-100 transition">
                    <button
                      type="button"
                      @click="startEditMessage(msg)"
                      class="text-[10px] px-1 py-0.5 rounded hover:bg-emerald-700/60 text-emerald-100 cursor-pointer transition"
                      title="Edit pesan"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      @click="handleDeleteMessage(msg.id)"
                      class="text-[10px] px-1 py-0.5 rounded hover:bg-emerald-700/60 text-emerald-100 cursor-pointer transition"
                      title="Hapus pesan untuk semua orang"
                    >
                      🗑️
                    </button>
                  </div>

                  <div :class="['text-[10px] flex items-center justify-end gap-1 shrink-0', isMyMessage(msg) ? 'text-emerald-100' : 'text-gray-400']">
                    <span v-if="msg.is_edited || msg.isEdited" class="text-[9px] opacity-80 italic">(diedit)</span>
                    <span>{{ formatTime(msg.created_at || msg.createdAt || msg.time) }}</span>
                    <span v-if="isMyMessage(msg)">✓✓</span>
                  </div>
                </div>
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
        class="p-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 relative z-[9999] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
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

        <!-- FORM SUBMIT EKSPLISIT SESUAI PERMINTAAN USER -->
        <form @submit.prevent="handleKirimPesan" class="flex items-center gap-2">
          <input
            id="chat_vue_input"
            ref="inputFieldRef"
            type="text"
            :value="pesanTeks"
            @input="handleInputWithTyping"
            @keydown.enter.exact.prevent="handleKirimPesan"
            placeholder="Tulis pesan..."
            autocomplete="off"
            class="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2.5 rounded-full text-base outline-none focus:ring-2 focus:ring-emerald-500"
            style="font-size: 16px !important; pointer-events: auto !important;"
          />
          <button
            type="submit"
            class="p-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md"
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
import { requestBrowserNotificationPermission, showSystemWebNotification } from '../../lib/webNotification';

interface CurrentUser {
  id: string;
  email?: string;
  name: string;
  role: 'buyer' | 'seller' | 'courier' | 'coop_admin' | 'superadmin';
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
  reactions?: Record<string, number>;
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

// 1. DAFTAR AKUN PRESET RESMI
const PRESET_ACCOUNTS: CurrentUser[] = [
  {
    id: 'usr_raisa_buyer',
    email: 'raisa14@gmail.com',
    name: 'Raisa',
    role: 'buyer',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa'
  },
  {
    id: 'usr_udin_seller',
    email: 'udin14@gmail.com',
    name: 'Udin',
    role: 'seller',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Udin'
  },
  {
    id: 'usr_budi_courier',
    email: 'driver_1',
    name: 'Pak Budi',
    role: 'courier',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Budi'
  },
  {
    id: 'usr_koperasi_admin',
    email: 's1',
    name: 'Admin Koperasi',
    role: 'coop_admin',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi'
  },
  {
    id: 'usr_nurmiyaty_superadmin',
    email: 'miyya@gmail.com',
    name: 'Ibu Nurmiyaty',
    role: 'superadmin',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nurmiyaty'
  }
];

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
      else if (rawRole.includes('admin')) normRole = 'superadmin';

      const normEmail = parsed.email || (normRole === 'seller' ? 'udin14@gmail.com' : 'raisa14@gmail.com');
      const normId = String(parsed.id || parsed.user_id || normEmail);
      const normName = String(parsed.name || parsed.nama || parsed.username || (normRole === 'seller' ? 'Udin' : 'Raisa'));

      return {
        id: normId,
        email: normEmail,
        name: normName,
        role: normRole,
        avatar: parsed.avatar || (normRole === 'seller' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=Udin' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa')
      };
    }
  } catch (e) {
    console.error('Error reading active user:', e);
  }

  return {
    id: props.currentUserId || 'usr_raisa_buyer',
    email: 'raisa14@gmail.com',
    name: props.currentUserName || 'Raisa',
    role: 'buyer',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa'
  };
};

const currentUser = ref<CurrentUser>(getActiveUser());
const showProfileModal = ref(false);

// 3. ROLE BADGE HELPER
function getRoleBadge(role?: string) {
  const r = (role || 'buyer').toLowerCase();
  if (r === 'ai' || r === 'ai_agent' || r.includes('asisten')) {
    return {
      label: '🤖 Asisten AI Toko',
      shortLabel: 'AI',
      bgClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    };
  }
  if (r === 'seller' || r === 'penjual') {
    return {
      label: '🏪 Penjual Lapak',
      shortLabel: 'Penjual',
      bgClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  if (r === 'courier' || r === 'driver' || r === 'kurir') {
    return {
      label: '🛵 Kurir Kampus',
      shortLabel: 'Kurir',
      bgClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    };
  }
  if (r === 'coop_admin' || r === 'koperasi') {
    return {
      label: '🏬 Pengurus Koperasi',
      shortLabel: 'Koperasi',
      bgClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  if (r === 'superadmin' || r === 'super_admin' || r === 'admin') {
    return {
      label: '🛡️ Super Admin (Nurmiyaty)',
      shortLabel: 'Super Admin',
      bgClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  }
  return {
    label: '🛍️ Pelanggan / Mahasiswa',
    shortLabel: 'Pembeli',
    bgClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };
}

// 4. DAFTAR KONTAK BERDASARKAN USER AKTIF
const getContactsForUser = (user: CurrentUser) => {
  if (user.role === 'seller' || user.id.includes('udin')) {
    return [
      {
        id: 'room_raisa',
        partner_id: 'usr_raisa_buyer',
        partner_email: 'raisa14@gmail.com',
        name: 'Raisa (Pembeli)',
        role: 'buyer',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Raisa',
        lastMessage: 'Halo Kak! Stok barang ready ya...',
        time: '10:33'
      },
      {
        id: 'room_kurir_budi',
        partner_id: 'usr_budi_courier',
        partner_email: 'driver_1',
        name: 'Pak Budi (Kurir Kampus)',
        role: 'courier',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Budi',
        lastMessage: 'Pesanan sedang menuju lokasi 🛵',
        time: '14:20'
      },
      {
        id: 'room_koperasi',
        partner_id: 'usr_koperasi_admin',
        partner_email: 's1',
        name: 'Admin Koperasi UIN Antasari',
        role: 'coop_admin',
        avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi',
        lastMessage: 'Voucher belanja kampus aktif!',
        time: '09:15'
      }
    ];
  }

  // Default: Buyer contacts
  return [
    {
      id: 'room_udin',
      partner_id: 'usr_udin_seller',
      partner_email: 'udin14@gmail.com',
      name: 'Udin (Penjual)',
      role: 'seller',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Udin',
      lastMessage: 'Halo Kak! Stok barang ready ya...',
      time: '16:50'
    },
    {
      id: 'room_kurir_budi',
      partner_id: 'usr_budi_courier',
      partner_email: 'driver_1',
      name: 'Pak Budi (Kurir Kampus)',
      role: 'courier',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Budi',
      lastMessage: 'Pesanan sedang menuju lokasi 🛵',
      time: '14:20'
    },
    {
      id: 'room_koperasi',
      partner_id: 'usr_koperasi_admin',
      partner_email: 's1',
      name: 'Admin Koperasi UIN Antasari',
      role: 'coop_admin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Koperasi',
      lastMessage: 'Voucher belanja kampus aktif!',
      time: '09:15'
    }
  ];
};

const contactsList = ref(getContactsForUser(currentUser.value));
// Alias ref untuk kompatibilitas & proteksi undefined
const contacts = contactsList;
const defaultPartner = computed(() => contactsList.value[0]);

// 5. Selected Chat State
const selectedChat = ref<any>(
  props.roomId
    ? {
        id: props.roomId,
        partner_id: props.roomId,
        partner_email: props.roomId,
        name: props.activeRoomName || defaultPartner.value.name,
        role: props.activeRoomRole || defaultPartner.value.role,
        avatar: props.activeRoomAvatar || defaultPartner.value.avatar
      }
    : (typeof window !== 'undefined' && window.innerWidth >= 768
        ? defaultPartner.value
        : null)
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
  { key: 'courier', label: '🛵 Kurir' },
  { key: 'coop_admin', label: '🏬 Koperasi' }
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
  'Halo Kak Raisa! 🌸 Selamat datang di Udin. Produk kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan hari ini? 😊✨',
  'Stoknya masih ready banget Kak! Siap dipesan dan bisa langsung diambil di Vending Machine kampus atau COD yaa! 🌸🥰',
  'Harganya spesial cuma Rp 35.000 (lagi promo dari Rp 40.000 lho!). Sudah dapat blind bag mystery aesthetic dan ganci unik siap pakai! 🎁✨',
  'Bisa banget COD di Kampus 1 & Kampus 2 UIN Antasari Banjarmasin kak! 🛵✨',
  'Terima kasih banyak sudah berbelanja di toko kami! 🙏✨'
];

// Template AI terstruktur untuk Drawer AI Tools
const aiTemplates = [
  {
    label: '🌸 Sambutan Selamat Datang (Resmi)',
    text: 'Halo Kak Raisa! 🌸 Selamat datang di Udin. Produk kami siap dipesan. Ada yang mau ditanyakan seputar stok atau pemesanan hari ini? 😊✨'
  },
  {
    label: '📦 Info Stok Ready & Vending Machine',
    text: 'Stoknya masih ready banget Kak! Siap dipesan dan bisa langsung diambil di Vending Machine kampus atau COD yaa! 🌸🥰'
  },
  {
    label: '🎁 Info Harga Promo Diskon',
    text: 'Harganya spesial cuma Rp 35.000 (lagi promo dari Rp 40.000 lho!). Sudah dapat blind bag mystery aesthetic dan ganci unik siap pakai! 🎁✨'
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
    ? (user.email || user.partner_email || user.partnerEmail || user.partner_id || user.id || user.user_id || '')
    : String(user);
  return normalizeUserId(raw);
};

// 🚀 SINKRONISASI ROOM AKTIF DETERMINISTIK (KUNCI SYNC LAPTOP & HP)
const currentDeterministicRoomId = computed(() => {
  const idA = getNormalizedId(currentUser.value);
  const activePartner = selectedChat.value || (currentUser.value?.role === 'seller' ? { email: 'raisa14@gmail.com', id: 'usr_raisa_buyer' } : { email: 'udin14@gmail.com', id: 'usr_udin_seller' });
  const idB = getNormalizedId(activePartner);
  const sorted = [idA, idB].sort();
  return `${sorted[0]}-${sorted[1]}`;
});

const activeRoom = computed(() => {
  const detRoomId = currentDeterministicRoomId.value;
  return {
    id: detRoomId,
    room_id: detRoomId,
    roomId: detRoomId,
    otherId: (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com'),
    otherName: activePartnerName.value,
    otherRole: activePartnerRole.value,
    otherAvatar: activePartnerAvatar.value
  };
});

// 🚀 HANDLER KETIKA UDIN MENGIRIM BALASAN AI (SENDER_ID RESMI UDIN, ROLE SELLER, JARINGAN TERJAMIN)
const sendAIMessageFromSeller = async (aiContent: string) => {
  if (!aiContent || !aiContent.trim()) return;

  const activeRoomId = activeRoom.value?.id || 'room_raisa_udin';
  
  // SENDER_ID HARUS SAMA PERSIS DENGAN ID USER UDIN
  const sellerId = currentUser.value?.id || 'usr_udin_seller';
  const sellerName = currentUser.value?.name || 'Udin';
  const partnerId = selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
  const partnerName = activePartnerName.value || 'Raisa';
  const partnerRole = activePartnerRole.value || (currentUser.value?.role === 'seller' ? 'buyer' : 'seller');

  const aiPayload = {
    id: 'msg_ai_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    room_id: activeRoomId,
    roomId: activeRoomId,
    sender_id: sellerId, // <--- KUNCI UTAMA: Wajib pakai ID Udin!
    senderId: sellerId,
    sender_name: sellerName,
    senderName: sellerName,
    sender_role: 'seller', // Wajib role seller agar tidak difilter
    senderRole: 'seller',
    is_ai: true, // Flag penanda bahwa ini respon dari bot toko
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
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // 1. Tampilkan di layar Udin dengan deduplikasi aman
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
    list = list.filter(c => c.role === activeRoleFilter.value);
  }
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(c => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
});

function selectContact(c: any) {
  selectedChat.value = c;
  rawMessagesMap.clear();
  messages.value = [];
  // Hapus badge unread saat kontak dibuka
  if (c?.id != null) clearUnread(String(c.id));
  // Reset typing indicator
  isPartnerTyping.value = false;
  if (partnerTypingTimeout) clearTimeout(partnerTypingTimeout);
  loadChatHistory();
  setupSoketiRoomSubscription();
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
  return props.activeRoomRole || selectedChat.value?.role || 'seller';
});

// ==========================================
// 🎯 ATURAN POSISI BUBBLE CHAT (STRICT SENDER ID MATCH)
// ==========================================
const isMyMessage = (msg: any): boolean => {
  if (!msg) return false;
  // Jika pesan baru dikirim dari perangkat ini
  if (msg.is_self === true || msg.isSelf === true) return true;

  const currentUserId = String(currentUser.value?.id || '');
  const msgSenderId = String(msg.senderId || msg.sender_id || msg.sender || (msg as any).fromId || '');

  if (!msgSenderId || !currentUserId) return false;

  // 1. Cocokkan ID persis
  if (msgSenderId === currentUserId) return true;

  // 2. Cek normalisasi ID (menghubungkan '101', 'raisa14@gmail.com', 'usr_raisa_buyer', dll)
  const myNorm = normalizeUserId(currentUserId);
  const senderNorm = normalizeUserId(msgSenderId);
  if (myNorm && senderNorm && myNorm === senderNorm) return true;

  // 3. Substring match jika format ID mengandung yang lain
  if (msgSenderId.includes(currentUserId) || currentUserId.includes(msgSenderId)) {
    return true;
  }

  // 4. Periksa kecocokan nama pengirim jika ID belum match
  const myName = String(currentUser.value?.name || '').toLowerCase().trim();
  const senderName = String(msg.senderName || msg.sender_name || '').toLowerCase().trim();
  if (myName && senderName && myName === senderName) {
    return true;
  }

  return false;
};

// Alias untuk backward compatibility
const isSender = isMyMessage;
const isSelf = isMyMessage;

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

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainerRef.value) {
      messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight;
    }
  });
}

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
        m.reactions = { ...(m.reactions || {}), ...newMsg.reactions };
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
  const isMine = newMsg.is_self !== undefined ? Boolean(newMsg.is_self) : isSender(newMsg);

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
  scrollToBottom();
  return true;
};

// 📥 MUAT RIWAYAT OBROLAN (< 24 JAM) DARI CLOUD SYNC & CACHE LOKAL
const loadChatHistory = async () => {
  try {
    const myId = currentUser.value?.id || '';
    const myNorm = normalizeUserId(myId);
    const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
    const partnerNorm = normalizeUserId(partnerId);
    const targetRoomId = activeRoom.value?.id || getDeterministicRoomId(myNorm, partnerNorm);

    // 1. Ambil dari cache lokal room terlebih dahulu (instan render)
    try {
      const cached = localStorage.getItem(`am_chat_history_${targetRoomId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          markExistingAsNotified(parsed);
          parsed.forEach(m => appendMessageSafe(m));
        }
      }
    } catch (_e) {}

    // 2. Ambil dari Upstash Redis Cloud & Local Storage
    const res = await fetchCloudChats(myNorm);
    if (res && res.chats && res.chats.length > 0) {
      markExistingAsNotified(res.chats);
      res.chats.forEach(m => {
        const sNorm = normalizeUserId(m.senderId || (m as any).sender_id);
        const rNorm = normalizeUserId(m.receiverId || (m as any).receiver_id);
        const mRoom = m.roomId || (m as any).room_id || getDeterministicRoomId(sNorm, rNorm);

        const isMatch = mRoom === targetRoomId ||
          mRoom === [myNorm, partnerNorm].sort().join('__') ||
          ((sNorm === myNorm && rNorm === partnerNorm) || (sNorm === partnerNorm && rNorm === myNorm));

        if (isMatch) {
          appendMessageSafe(m);
        }
      });
    }
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
const applyLocalReaction = (msgId: string | number, emoji: string) => {
  const sMsgId = String(msgId);
  const target = Array.from(rawMessagesMap.values()).find(m => String(m.id) === sMsgId);
  if (target) {
    if (!target.reactions) target.reactions = {};
    target.reactions[emoji] = (target.reactions[emoji] || 0) + 1;
    syncMessagesFromMap();
  }
};

const handleReactToMessage = async (msgId: any, emoji: string) => {
  if (!msgId || !emoji) return;
  const sMsgId = String(msgId);
  const currentRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'global';
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');

  // 1. Update status reaksi lokal seketika
  applyLocalReaction(sMsgId, emoji);

  // 2. Siarkan ke Upstash Redis Cloud Sync & BroadcastChannel
  try {
    await syncCloudReaction(sMsgId, emoji, String(currentRoomId));
  } catch (_e) {}

  // 3. Siarkan ke Soketi Room Channel Real-Time
  try {
    broadcastSoketiAction(currentUser.value.id, String(partnerId), 'ReactionAdded', {
      id: sMsgId,
      msgId: sMsgId,
      emoji,
      userId: currentUser.value.id,
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
        userId: currentUser.value.id
      });
    }
  } catch (_e) {}
};

// ==========================================
// ✏️🗑️ MANAJEMEN AKSI PESAN (EDIT & HAPUS REAL-TIME)
// ==========================================
const startEditMessage = (msg: ChatMessage) => {
  editingMessageId.value = msg.id != null ? msg.id : null;
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
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
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

  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
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

const handleIncomingReactionAdded = (data: { id?: string | number; msgId?: string | number; emoji: string }) => {
  const mId = data.msgId != null ? data.msgId : data.id;
  if (mId != null && data.emoji) {
    applyLocalReaction(mId, data.emoji);
  }
};

// ⌨️ Handler Mengetik Real-time ke Soketi & BroadcastChannel
const handleTypingInput = () => {
  const currentUserId = currentUser.value?.id;
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
  const roomId = String(activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'room_default');
  const myName = currentUser.value?.name || (currentUser.value?.role === 'seller' ? 'Udin' : 'Raisa');

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
// 📨 PENANGAN PESAN MASUK DARI SOKETI / PUSHER (NORMALISASI STATE MESSAGES)
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

  const msgText = rawMsg.text || rawMsg.content || rawMsg.message || '';
  if (!msgText && !rawMsg.mediaUrl) return;

  const rawSenderId = rawMsg.senderId || rawMsg.sender_id || rawMsg.sender || '';
  const msgTime = rawMsg.time || formatTime(rawMsg.timestamp || rawMsg.createdAt || rawMsg.created_at);
  const msgTimestamp = rawMsg.timestamp || rawMsg.createdAt || rawMsg.created_at || new Date().toISOString();

  // ↩️ NORMALISASI & RESOLUSI DATA BALASAN (REPLY) DI SISI PENERIMA
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
    if (normalizedReply.id && (!normalizedReply.text && !normalizedReply.content)) {
      const refMsg = Array.from(rawMessagesMap.values()).find(m => String(m.id) === String(normalizedReply.id)) ||
                     messages.value.find((m: any) => String(m.id) === String(normalizedReply.id));
      if (refMsg) {
        normalizedReply.text = refMsg.text || refMsg.content || '';
        normalizedReply.content = refMsg.text || refMsg.content || '';
        normalizedReply.senderName = normalizedReply.senderName || normalizedReply.sender_name || refMsg.senderName || refMsg.sender_name || 'Pengguna';
        normalizedReply.sender_name = normalizedReply.senderName || normalizedReply.sender_name || refMsg.senderName || refMsg.sender_name || 'Pengguna';
      }
    }
    normalizedReply = {
      id: normalizedReply.id,
      senderName: normalizedReply.senderName || normalizedReply.sender_name || 'Pengguna',
      sender_name: normalizedReply.senderName || normalizedReply.sender_name || 'Pengguna',
      text: normalizedReply.text || normalizedReply.content || '',
      content: normalizedReply.text || normalizedReply.content || ''
    };
  }

  const msg = {
    id: rawMsg.id || Date.now().toString(),
    senderId: rawSenderId,
    sender_id: rawSenderId,
    senderName: rawMsg.senderName || rawMsg.sender_name || 'Pengguna',
    sender_name: rawMsg.senderName || rawMsg.sender_name || 'Pengguna',
    senderRole: rawMsg.senderRole || rawMsg.sender_role || '',
    sender_role: rawMsg.sender_role || rawMsg.senderRole || '',
    text: msgText,
    content: msgText,
    timestamp: msgTimestamp,
    createdAt: msgTimestamp,
    created_at: msgTimestamp,
    time: msgTime,
    replyTo: normalizedReply,
    reply_to: normalizedReply,
    reactions: rawMsg.reactions || {}
  };

  // Cek apakah pesan sudah ada di list agar tidak duplikat
  const existingMsg = messages.value.find((m: any) => m.id === msg.id || String(m.id) === String(msg.id));
  if (!existingMsg) {
    messages.value.push(msg);
    rawMessagesMap.set(String(msg.id), msg);
    if (!isMyMessage(msg)) {
      triggerNotificationBeepAndToast(msg);
    }
    scrollToBottom();
  } else {
    // Sinkronkan data reply jika sebelumnya belum terpasang
    if (!existingMsg.replyTo && normalizedReply) {
      existingMsg.replyTo = normalizedReply;
      existingMsg.reply_to = normalizedReply;
    }
  }
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
  const activePartner = selectedChat.value || (currentUser.value?.role === 'seller' ? { email: 'raisa14@gmail.com', id: 'usr_raisa_buyer' } : { email: 'udin14@gmail.com', id: 'usr_udin_seller' });
  const idB = getNormalizedId(activePartner);
  if (!idA || !idB) return;

  const sorted = [idA, idB].sort();
  const roomKey = `${sorted[0]}-${sorted[1]}`;
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
      const pId = String(partnerId);
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

// ==========================================
// 🤖 LOGIKA BALASAN AI OTOMATIS (AI AUTO-RESPONDER TOKO)
// ==========================================
let aiReplyTimeout: any = null;
let lastAiTriggerTime = 0;

const triggerSellerAIReply = (buyerMessageText: string) => {
  // 🛡️ Mencegah Bot Auto-Reply Terpanggil Ganda:
  // Nonaktifkan pemicu AI bot otomatis jika room chat dibuka antar akun pengguna nyata (Raisa <-> Udin).
  // Bot hanya boleh merespons jika lawan bicara adalah akun official bot AI (`udin-ai` atau role `ai`).
  const partnerIdStr = String((activeRoom.value as any)?.partner_id || (activeRoom.value as any)?.otherId || selectedChat.value?.partner_id || selectedChat.value?.id || '').toLowerCase();
  const partnerRoleStr = String((activeRoom.value as any)?.partner_role || (activeRoom.value as any)?.otherRole || selectedChat.value?.role || '').toLowerCase();
  const isAiPartner = partnerIdStr.includes('udin-ai') || partnerIdStr === 'ai' || partnerRoleStr === 'ai';
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
      `Hai Kak ${currentUser.value?.name || 'Raisa'}! 🌸 Terima kasih sudah chat. Pesan "${buyerMessageText}" sudah kami terima ya! Ada yang ingin ditanyakan terkait ketersediaan stok atau pengiriman? 🥰`,
      `Halo Kak! Produk kami siap dipesan yaa ✨ Mau sekalian dibungkus rapi atau ada catatan khusus?`,
      `Siap Kak! Untuk pesanan dan detail produk bisa langsung kami siapkan. Ditunggu konfirmasinya yaa! 🛍️`
    ];
    const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];

    const targetRoomId = activeRoom.value?.id || props.roomId || selectedChat.value?.id || 'room_raisa_udin';
    const targetPartnerId = (activeRoom.value as any)?.partner_id || (activeRoom.value as any)?.otherId || selectedChat.value?.partner_id || 'usr_udin_seller';
    const targetPartnerName = (activeRoom.value as any)?.partner_name || (activeRoom.value as any)?.otherName || selectedChat.value?.name || 'Udin';

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
      receiver_id: currentUser.value?.id || 'usr_raisa_buyer',
      receiverId: currentUser.value?.id || 'usr_raisa_buyer',
      receiver_name: currentUser.value?.name || 'Raisa',
      receiverName: currentUser.value?.name || 'Raisa',
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
        receiverId: currentUser.value?.id || 'usr_raisa_buyer',
        receiverName: currentUser.value?.name || 'Raisa',
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

  // Ambil teks baik dari reactive state pesanTeks ataupun langsung dari DOM ref
  const textFromDom = (inputFieldRef.value?.value || nativeInputRef.value?.value || '').trim();
  const textFromState = (pesanTeks.value || '').trim();
  const textToSend = textFromState || textFromDom;
  if (!textToSend) return;

  isSendingMessage = true;
  setTimeout(() => {
    isSendingMessage = false;
  }, 350);

  const currentRoomId = activeRoom.value.id;
  const partnerId = (activeRoom.value as any)?.otherId || (selectedChat.value as any)?.partner_email || selectedChat.value?.partner_id || selectedChat.value?.id || (currentUser.value?.role === 'seller' ? 'raisa14@gmail.com' : 'udin14@gmail.com');
  const partnerName = activePartnerName.value || 'Raisa';
  const partnerRole = activePartnerRole.value || (currentUser.value?.role === 'seller' ? 'buyer' : 'seller');
  const myId = currentUser.value?.id || (currentUser.value?.role === 'seller' ? 'usr_udin_seller' : 'usr_raisa_buyer');
  const myName = currentUser.value?.name || (currentUser.value?.role === 'seller' ? 'Udin' : 'Raisa');
  const myRole = currentUser.value?.role || 'seller';

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
    is_self: true,
    isSelf: true,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  // 1. Tampilkan pesan ke riwayat chat lokal dengan proteksi anti-dobel ketat
  appendMessageSafe(payload);

  // 2. Kosongkan kotak input native, state reaktif, dan mode balas
  pesanTeks.value = '';
  replyingToMessage.value = null;
  if (inputFieldRef.value) inputFieldRef.value.value = '';
  if (nativeInputRef.value) nativeInputRef.value.value = '';

  // 3. Siarkan ke Upstash Redis Cloud Sync (SafeChatSyncHub otomatis mengelola broadcast)
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

  // 3.5 Siarkan ke Soketi / Pusher Room Channel Real-Time & Hentikan Status Mengetik
  const myNormId = getNormalizedId(currentUser.value);
  const activePartner = selectedChat.value || (currentUser.value?.role === 'seller' ? { email: 'raisa14@gmail.com', id: 'usr_raisa_buyer' } : { email: 'udin14@gmail.com', id: 'usr_udin_seller' });
  const partnerNormId = getNormalizedId(activePartner);
  const sorted = [myNormId, partnerNormId].sort();
  const sRoom = `chat-room-${sorted[0]}-${sorted[1]}`;

  try {
    broadcastSoketiAction(myNormId, partnerNormId, 'NewMessage', payload);
    broadcastSoketiAction(myNormId, partnerNormId, 'typing', {
      roomId: currentRoomId,
      userId: myNormId,
      userName: myName,
      isTyping: false
    });
  } catch (_e) {}

  // 3.6 Direct HTTP Broadcast Fallback ke Soketi Bridge (Port 6001)
  try {
    const wsHost = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
    fetch(`http://${wsHost}:6001/apps/campusmart/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: sRoom,
        channels: [sRoom],
        name: 'NewMessage',
        data: payload
      })
    }).then(() => {
      console.log('[CHAT DEBUG] HTTP Broadcast success to:', sRoom);
    }).catch(err => console.error('Gagal broadcast HTTP:', err));
  } catch (_e) {}

  // 4. Siarkan ke WebSocket FrankenPHP jika tersambung
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
      scrollToBottom();
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
      const activePartner = selectedChat.value || (currentUser.value?.role === 'seller' ? { email: 'raisa14@gmail.com', id: 'usr_raisa_buyer' } : { email: 'udin14@gmail.com', id: 'usr_udin_seller' });
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
      const isMine = isSelf(incomingMsg);
      appendMessageSafe({
        id: incomingMsg.id,
        room_id: incomingMsg.roomId,
        roomId: incomingMsg.roomId,
        sender_id: incomingMsg.senderId || (incomingMsg as any).fromId,
        senderId: incomingMsg.senderId || (incomingMsg as any).fromId,
        sender_name: incomingMsg.senderName || (incomingMsg as any).fromName,
        senderName: incomingMsg.senderName || (incomingMsg as any).fromName,
        sender_role: incomingMsg.senderRole || (incomingMsg as any).fromRole,
        senderRole: incomingMsg.senderRole || (incomingMsg as any).fromRole,
        receiver_id: incomingMsg.receiverId || (incomingMsg as any).toId,
        receiver_name: incomingMsg.receiverName || (incomingMsg as any).toName,
        text: incomingMsg.text,
        content: incomingMsg.text,
        time: incomingMsg.time || formatTime(incomingMsg.createdAt),
        created_at: incomingMsg.createdAt,
        createdAt: incomingMsg.createdAt,
        is_self: isMine,
        isSelf: isMine
      });

      // 🔔 NOTIFIKASI REAL-TIME: hanya jika pesan BUKAN dari diri sendiri
      // 🔔 NOTIFIKASI REAL-TIME: lewat triggerNotificationBeepAndToast yang punya proteksi anti-loop & anti-toast jika obrolan terbuka
      if (!isMine) {
        triggerNotificationBeepAndToast(incomingMsg);

        const senderNorm = normalizeUserId(incomingMsg.senderId || '');
        // Update last message di daftar kontak
        const ci = contactsList.value.findIndex(c =>
          normalizeUserId(String(c.id)) === senderNorm ||
          normalizeUserId(c.name || '') === senderNorm ||
          normalizeUserId(c.partner_id || '') === senderNorm
        );
        if (ci !== -1) {
          contactsList.value[ci] = {
            ...contactsList.value[ci],
            lastMessage: incomingMsg.text,
            time: formatTime(incomingMsg.createdAt)
          };
        }

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
    applyLocalReaction(detail.msgId, detail.emoji);
  };
  window.addEventListener('am_chat_reaction', onIncomingReaction);
  activeIncomingReactionHandler = onIncomingReaction;

  // BroadcastChannel untuk reaksi pesan antar tab
  let reactionBc: BroadcastChannel | null = null;
  try {
    reactionBc = new BroadcastChannel('am_campus_chat_channel_v4');
    reactionBc.onmessage = (event) => {
      if (event.data?.type === 'reaction' && event.data?.data) {
        const { msgId, emoji } = event.data.data;
        if (msgId && emoji) {
          applyLocalReaction(msgId, emoji);
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
            m.reactions = { ...(m.reactions || {}), ...reactionStore[key] };
          }
        }
      });
    }
  } catch (_e) {}

  // Muat riwayat pesan room (< 24 jam) saat komponen di-mount
  loadChatHistory();

  // 🔄 Periodic Background Sync dari Redis setiap 2.5s (Menjamin pesan Udin langsung masuk ke Laptop Raisa)
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

  // 📡 BERLANGGANAN ROOM SOKETI / PUSHER REAL-TIME (DETERMINISTIC ROOM CHANNEL)
  setupSoketiRoomSubscription();

  scrollToBottom();
});

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
