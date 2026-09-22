<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

// 🚀 Helper broadcast event ke Soketi Bridge Server di port 6001
function broadcastToSoketi($channel, $event, $data) {
    $soketiUrl = getenv('SOKETI_URL') ?: 'http://127.0.0.1:6001/apps/campusmart/events';
    $postData = json_encode([
        'name' => $event,
        'channels' => [$channel],
        'data' => $data
    ]);

    $ch = curl_init($soketiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData)
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT_MS, 1500);
    $response = curl_exec($ch);
    curl_close($ch);
    return $response;
}

// 📦 Helper penyimpanan pesan ke Upstash Redis / Local JSON cache
function persistChatRecord($action, $payload) {
    $cacheDir = __DIR__ . '/storage';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0777, true);
    }
    $cacheFile = $cacheDir . '/franken_chat_store.json';
    $chats = [];
    if (file_exists($cacheFile)) {
        $chats = json_decode(file_get_contents($cacheFile), true) ?: [];
    }

    if ($action === 'send') {
        $chats[] = $payload;
    } elseif ($action === 'edit') {
        foreach ($chats as &$c) {
            if ((string)$c['id'] === (string)$payload['id']) {
                $c['text'] = $payload['text'];
                $c['is_edited'] = true;
                $c['edited_at'] = date('c');
            }
        }
    } elseif ($action === 'delete') {
        foreach ($chats as &$c) {
            if ((string)$c['id'] === (string)$payload['id']) {
                $c['is_deleted'] = true;
                $c['deleted_at'] = date('c');
            }
        }
    }

    @file_put_contents($cacheFile, json_encode($chats, JSON_PRETTY_PRINT));
}

// 1. Endpoint: PING / HEALTH CHECK
if (strpos($uri, 'ping') !== false || $uri === '/health') {
    echo json_encode([
        'status' => 'ok',
        'engine' => 'FrankenPHP Engine (Caddy + PHP 8.2)',
        'timestamp' => time(),
        'php_version' => PHP_VERSION,
        'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB'
    ]);
    exit;
}

// 2. Endpoint: POST /api/chat/send (atau /franken/chat/send)
if (strpos($uri, '/chat/send') !== false && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $roomId = $body['roomId'] ?? $body['room_id'] ?? 'general';
    $channelName = 'chat-room-' . $roomId;
    $msgId = $body['id'] ?? (round(microtime(true) * 1000));

    $messagePayload = [
        'id' => $msgId,
        'roomId' => $roomId,
        'room_id' => $roomId,
        'senderId' => $body['senderId'] ?? $body['fromId'] ?? 'unknown',
        'senderName' => $body['senderName'] ?? $body['fromName'] ?? 'Pengguna',
        'senderRole' => $body['senderRole'] ?? $body['fromRole'] ?? 'buyer',
        'receiverId' => $body['receiverId'] ?? $body['toId'] ?? '',
        'text' => $body['text'] ?? '',
        'content' => $body['text'] ?? '',
        'time' => date('H:i'),
        'createdAt' => date('c'),
        'replyTo' => $body['replyTo'] ?? null,
        'reactions' => []
    ];

    // Simpan ke storage
    persistChatRecord('send', $messagePayload);

    // Broadcast ke Soketi
    broadcastToSoketi($channelName, 'NewMessage', $messagePayload);

    echo json_encode([
        'success' => true,
        'message' => 'Pesan berhasil dikirim via FrankenPHP',
        'data' => $messagePayload
    ]);
    exit;
}

// 3. Endpoint: POST /api/chat/edit (atau /franken/chat/edit)
if (strpos($uri, '/chat/edit') !== false && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $roomId = $body['roomId'] ?? $body['room_id'] ?? 'general';
    $channelName = 'chat-room-' . $roomId;
    $msgId = $body['id'] ?? null;
    $newText = $body['text'] ?? '';

    $editPayload = [
        'id' => $msgId,
        'text' => $newText,
        'content' => $newText,
        'is_edited' => true,
        'edited_at' => date('c'),
        'roomId' => $roomId
    ];

    persistChatRecord('edit', $editPayload);
    broadcastToSoketi($channelName, 'MessageUpdated', $editPayload);

    echo json_encode([
        'success' => true,
        'message' => 'Pesan berhasil diperbarui via FrankenPHP',
        'data' => $editPayload
    ]);
    exit;
}

// 4. Endpoint: POST /api/chat/delete (atau /franken/chat/delete)
if (strpos($uri, '/chat/delete') !== false && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $roomId = $body['roomId'] ?? $body['room_id'] ?? 'general';
    $channelName = 'chat-room-' . $roomId;
    $msgId = $body['id'] ?? null;

    $deletePayload = [
        'id' => $msgId,
        'is_deleted' => true,
        'deleted_at' => date('c'),
        'roomId' => $roomId
    ];

    persistChatRecord('delete', $deletePayload);
    broadcastToSoketi($channelName, 'MessageDeleted', $deletePayload);

    echo json_encode([
        'success' => true,
        'message' => 'Pesan berhasil dihapus via FrankenPHP',
        'data' => $deletePayload
    ]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Endpoint FrankenPHP tidak ditemukan', 'uri' => $uri]);
