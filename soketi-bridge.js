/**
 * =========================================================================
 * ⚡ CAMPUS MART SOKETI / PUSHER V7 BRIDGE SERVER
 * Micro-Server WebSocket mandiri untuk menggantikan Soketi / Docker lokal
 * Mendukung Pusher v7 Protocol (pusher-js & laravel-echo) di port 6001
 * =========================================================================
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.SOKETI_PORT || 6001;
const HOST = process.env.SOKETI_HOST || '0.0.0.0';
const APP_KEY = process.env.SOKETI_KEY || 'campusmartkey';

// Map menyimpan channel: channelName -> Set<WebSocket>
const channels = new Map();

// Helper untuk mengirim pesan format Pusher
function sendPusherMessage(ws, event, data, channel = null) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const payload = {
    event,
    data: typeof data === 'string' ? data : JSON.stringify(data)
  };
  if (channel) {
    payload.channel = channel;
  }
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error('[Soketi-Bridge] Error sending message to client:', err.message);
  }
}

// Helper mencari semua variasi nama channel yang merujuk ke pasangan user yang sama
function normalizeChannel(ch) {
  return (ch || '')
    .toLowerCase()
    .trim()
    .replace(/^private-/, '')
    .replace(/^chat\./, '')
    .replace(/^chat-room-/, '')
    .replace(/^room_/, '')
    .replace(/^chat_/, '')
    .replace(/^order\./, 'order_')
    .replace(/___/g, '_')
    .replace(/__/g, '_')
    .replace(/-/g, '_');
}

function getMatchingChannelNames(targetChannel) {
  const normTarget = (targetChannel || '').toLowerCase().trim();
  const cleanTarget = normalizeChannel(targetChannel);
  const matched = new Set();
  if (channels.has(targetChannel)) matched.add(targetChannel);

  for (const ch of channels.keys()) {
    const normCh = ch.toLowerCase().trim();
    if (normCh === normTarget) {
      matched.add(ch);
      continue;
    }
    const cleanCh = normalizeChannel(ch);
    if (cleanTarget && cleanCh && cleanTarget === cleanCh) {
      matched.add(ch);
    }
  }
  return Array.from(matched);
}

// Broadcast ke semua client di dalam channel tertentu beserta aliasnya
function broadcastToChannel(channelName, event, data, excludeSocket = null) {
  const targetChannels = getMatchingChannelNames(channelName);
  if (targetChannels.length === 0 && channels.has(channelName)) {
    targetChannels.push(channelName);
  }

  let count = 0;
  const sentSockets = new Set();
  if (excludeSocket) sentSockets.add(excludeSocket);

  for (const ch of targetChannels) {
    const subscribers = channels.get(ch);
    if (!subscribers) continue;

    for (const client of subscribers) {
      if (!sentSockets.has(client) && client.readyState === WebSocket.OPEN) {
        sendPusherMessage(client, event, data, ch);
        sentSockets.add(client);
        count++;
      }
    }
  }

  // 🛡️ Fallback: jika channel belum memiliki subscriber langsung tapi ada client WebSocket yang tersambung,
  // kirimkan ke SEMUA client yang aktif agar tidak ada pesan tertinggal (0 recipients)
  if (count === 0 && typeof wss !== 'undefined' && wss.clients) {
    for (const client of wss.clients) {
      if (!sentSockets.has(client) && client.readyState === WebSocket.OPEN) {
        sendPusherMessage(client, event, data, channelName);
        sentSockets.add(client);
        count++;
      }
    }
  }

  return count;
}

// 1. HTTP Server untuk Webhook, Trigger Event, & Health Check
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health' || req.url === '/up')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'CampusMart-Soketi-Bridge',
      port: PORT,
      activeChannels: channels.size,
      channels: Array.from(channels.entries()).map(([k, v]) => ({ channel: k, clients: v.size }))
    }));
    return;
  }

  // HTTP Event Trigger (Kompatibel dengan Laravel / FrankenPHP / Custom POST / Express)
  // URL: POST /apps/:appId/events atau POST /trigger atau POST /api/broadcast-chat
  if (req.method === 'POST' && (req.url.includes('/events') || req.url.includes('/trigger') || req.url.includes('/broadcast'))) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const eventName = payload.name || payload.event || 'NewMessage';
        const data = payload.data || payload;
        let targetChannels = payload.channels || (payload.channel ? [payload.channel] : []);
        if (targetChannels.length === 0) {
          const rId = data.roomId || data.room_id || 'room_admin_nurmiyaty_seller_udin';
          targetChannels = ['campusmart-chat', 'campusmart-chat-global', `chat.${rId}`, rId];
        }
        const socketId = payload.socket_id;

        let totalDelivered = 0;
        targetChannels.forEach(ch => {
          let excludeWs = null;
          if (socketId) {
            const subs = channels.get(ch);
            if (subs) {
              for (const ws of subs) {
                if (ws.socketId === socketId) {
                  excludeWs = ws;
                  break;
                }
              }
            }
          }
          totalDelivered += broadcastToChannel(ch, eventName, data, excludeWs);
          // Siarkan juga variasi event agar semua listener Echo/Pusher pasti menerimanya
          broadcastToChannel(ch, `.${eventName.replace(/^\./, '')}`, data, excludeWs);
          broadcastToChannel(ch, eventName.replace(/^\./, ''), data, excludeWs);
          broadcastToChannel(ch, 'NewMessage', data, excludeWs);
          broadcastToChannel(ch, '.NewMessage', data, excludeWs);
          broadcastToChannel(ch, 'new-message', data, excludeWs);
          broadcastToChannel(ch, 'client-message-sent', data, excludeWs);
        });

        console.log(`[CampusMart-Soketi] 📨 HTTP Trigger: ${eventName} -> [${targetChannels.join(', ')}] (${totalDelivered} recipients)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, delivered: totalDelivered }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// 2. WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Generate socket_id format Pusher: [digits].[digits]
  const socketId = `${Math.floor(100000000 + Math.random() * 900000000)}.${Math.floor(100000000 + Math.random() * 900000000)}`;
  ws.socketId = socketId;
  ws.subscriptions = new Set();

  const clientIp = req.socket.remoteAddress || 'unknown';
  console.log(`[CampusMart-Soketi] 🟢 Client terhubung (${socketId}) dari ${clientIp}`);

  // Langkah Handshake Pusher v7: Kirim pusher:connection_established seketika
  sendPusherMessage(ws, 'pusher:connection_established', {
    socket_id: socketId,
    activity_timeout: 120
  });

  // Heartbeat ping berkala (30s) untuk menjaga koneksi WebSocket tetap stabil
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      sendPusherMessage(ws, 'pusher:ping', {});
    }
  }, 30000);

  // Handle Pesan Masuk dari Client
  ws.on('message', rawMessage => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      const event = parsed.event;

      // 1. Handle Ping -> Balas Pong & Handle Pong
      if (event === 'pusher:ping') {
        sendPusherMessage(ws, 'pusher:pong', {});
        return;
      }
      if (event === 'pusher:pong') {
        return;
      }

      // 2. Handle Subscription (pusher:subscribe)
      if (event === 'pusher:subscribe') {
        const data = typeof parsed.data === 'string' ? JSON.parse(parsed.data || '{}') : (parsed.data || {});
        const channelName = data.channel || parsed.channel;

        if (channelName) {
          if (!channels.has(channelName)) {
            channels.set(channelName, new Set());
          }
          channels.get(channelName).add(ws);
          ws.subscriptions.add(channelName);

          // Balas konfirmasi subscription_succeeded
          sendPusherMessage(ws, 'pusher:subscription_succeeded', {}, channelName);
          console.log(`[CampusMart-Soketi] 📌 Socket ${socketId} JOIN channel: "${channelName}" (Members: ${channels.get(channelName).size})`);
        }
        return;
      }

      // 3. Handle Unsubscribe (pusher:unsubscribe)
      if (event === 'pusher:unsubscribe') {
        const data = typeof parsed.data === 'string' ? JSON.parse(parsed.data || '{}') : (parsed.data || {});
        const channelName = data.channel || parsed.channel;
        if (channelName && channels.has(channelName)) {
          channels.get(channelName).delete(ws);
          ws.subscriptions.delete(channelName);
          console.log(`[CampusMart-Soketi] 📤 Socket ${socketId} LEAVE channel: "${channelName}"`);
        }
        return;
      }

      // 4. Handle Event Broadcasting Antar Client:
      // (client-typing, NewMessage, MessageUpdated, MessageDeleted, ReactionAdded, dll)
      const targetChannel = parsed.channel;
      if (targetChannel) {
        let matchedChannel = targetChannel;
        if (!channels.has(matchedChannel)) {
          for (const ch of channels.keys()) {
            if (ch.toLowerCase() === targetChannel.toLowerCase()) {
              matchedChannel = ch;
              break;
            }
          }
        }

        if (channels.has(matchedChannel)) {
          let payloadData = parsed.data;
          if (typeof payloadData === 'string') {
            try {
              payloadData = JSON.parse(payloadData);
            } catch (_e) {}
          }

          const recipientCount = broadcastToChannel(matchedChannel, event, payloadData, ws);
          console.log(`[CampusMart-Soketi] ⚡ [${matchedChannel}] Event: "${event}" broadcasted ke ${recipientCount} client`);

          // Dual-broadcast: kirim kedua versi (dengan 'client-' dan tanpa 'client-')
          // agar kompatibel 100% baik dengan Echo listen(), listenForWhisper(), maupun raw Pusher bind()
          if (event.startsWith('client-')) {
            const alternateEvent = event.slice(7);
            broadcastToChannel(matchedChannel, alternateEvent, payloadData, ws);
          } else if (!event.startsWith('pusher:')) {
            const alternateEvent = `client-${event}`;
            broadcastToChannel(matchedChannel, alternateEvent, payloadData, ws);
          }
        }
      }
    } catch (err) {
      console.warn('[CampusMart-Soketi] Warning parsing client frame:', err.message);
    }
  });

  // Handle Client Disconnect
  ws.on('close', () => {
    clearInterval(heartbeat);
    // Bersihkan client dari semua channel yang di-subscribe
    for (const ch of ws.subscriptions) {
      const subs = channels.get(ch);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          channels.delete(ch);
        }
      }
    }
    console.log(`[CampusMart-Soketi] 🔴 Client terputus (${socketId})`);
  });

  ws.on('error', err => {
    console.warn(`[CampusMart-Soketi] Socket error (${socketId}):`, err.message);
  });
});

// Jalankan Server
server.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log(`[CampusMart-Soketi] 🚀 Server running at ws://${HOST}:${PORT}`);
  console.log(`[CampusMart-Soketi] 🔑 App Key: "${APP_KEY}" (Pusher v7 Protocol)`);
  console.log(`[CampusMart-Soketi] 🌐 Siap diakses dari Browser Laptop & HP Android`);
  console.log('================================================================');
});
