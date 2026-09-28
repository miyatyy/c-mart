import 'dart:convert';

/// Model Pesan Obrolan Kampus (Antasari Mart)
/// Kompatibel dengan payload Soketi, Pusher, dan Redis Cloud Sync
class ChatMessage {
  final String id;
  final String roomId;
  final String senderId;
  final String senderName;
  final String? senderRole;
  final String receiverId;
  final String? receiverName;
  final String? receiverRole;
  final String text;
  final String? time;
  final String? createdAt;
  final bool isSelf;
  final Map<String, dynamic>? replyTo;
  final Map<String, List<dynamic>> reactions;

  ChatMessage({
    required this.id,
    required this.roomId,
    required this.senderId,
    required this.senderName,
    this.senderRole,
    required this.receiverId,
    this.receiverName,
    this.receiverRole,
    required this.text,
    this.time,
    this.createdAt,
    this.isSelf = false,
    this.replyTo,
    this.reactions = const {},
  });

  /// Factory parser kompatibel payload Soketi terbaru:
  /// - Membaca replyTo / reply_to (baik Map maupun JSON string).
  /// - Membaca reactions sebagai Map<String, List<dynamic>>.
  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    // 1. Parse replyTo / reply_to (bisa berupa Map/Object atau string JSON)
    Map<String, dynamic>? parsedReplyTo;
    dynamic rawReply = json['replyTo'] ?? json['reply_to'];
    if (rawReply != null) {
      if (rawReply is Map<String, dynamic>) {
        parsedReplyTo = rawReply;
      } else if (rawReply is Map) {
        parsedReplyTo = Map<String, dynamic>.from(rawReply);
      } else if (rawReply is String && rawReply.trim().isNotEmpty) {
        try {
          final decoded = jsonDecode(rawReply);
          if (decoded is Map<String, dynamic>) {
            parsedReplyTo = decoded;
          } else if (decoded is Map) {
            parsedReplyTo = Map<String, dynamic>.from(decoded);
          }
        } catch (_) {
          parsedReplyTo = null;
        }
      }
    }

    // 2. Parse reactions (Map format: Map<String, List<dynamic>>)
    Map<String, List<dynamic>> parsedReactions = {};
    dynamic rawReactions = json['reactions'];
    if (rawReactions != null) {
      if (rawReactions is String && rawReactions.trim().isNotEmpty) {
        try {
          rawReactions = jsonDecode(rawReactions);
        } catch (_) {
          rawReactions = null;
        }
      }
      if (rawReactions is Map) {
        rawReactions.forEach((key, value) {
          final emojiKey = key.toString();
          if (value is List) {
            parsedReactions[emojiKey] = List<dynamic>.from(value);
          } else if (value is num && value > 0) {
            // Fallback untuk backward compatibility jika backend kirim angka
            parsedReactions[emojiKey] = List.generate(value.toInt(), (i) => 'legacy_user_$i');
          } else {
            parsedReactions[emojiKey] = [];
          }
        });
      }
    }

    final currentSenderId = json['senderId']?.toString() ??
        json['sender_id']?.toString() ??
        json['fromId']?.toString() ??
        '';

    return ChatMessage(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      roomId: (json['roomId'] ?? json['room_id'] ?? '').toString(),
      senderId: currentSenderId,
      senderName: (json['senderName'] ?? json['sender_name'] ?? json['fromName'] ?? 'Pengguna').toString(),
      senderRole: (json['senderRole'] ?? json['sender_role'] ?? json['fromRole'])?.toString(),
      receiverId: (json['receiverId'] ?? json['receiver_id'] ?? json['toId'] ?? '').toString(),
      receiverName: (json['receiverName'] ?? json['receiver_name'] ?? json['toName'])?.toString(),
      receiverRole: (json['receiverRole'] ?? json['receiver_role'] ?? json['toRole'])?.toString(),
      text: (json['text'] ?? json['content'] ?? json['message'] ?? '').toString(),
      time: json['time']?.toString(),
      createdAt: (json['createdAt'] ?? json['created_at'] ?? json['timestamp'])?.toString(),
      isSelf: json['isSelf'] == true ||
          json['is_self'] == true ||
          json['isSelf'] == 'true' ||
          json['is_self'] == 'true',
      replyTo: parsedReplyTo,
      reactions: parsedReactions,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'roomId': roomId,
      'senderId': senderId,
      'senderName': senderName,
      'senderRole': senderRole,
      'receiverId': receiverId,
      'receiverName': receiverName,
      'receiverRole': receiverRole,
      'text': text,
      'time': time,
      'createdAt': createdAt,
      'isSelf': isSelf,
      'replyTo': replyTo,
      'reactions': reactions,
    };
  }

  /// 3. Helper Parser Reaksi: hitung reaksi berdasarkan panjang list: reactions[emoji]?.length ?? 0
  int getReactionCount(String emoji) {
    return reactions[emoji]?.length ?? 0;
  }
}
