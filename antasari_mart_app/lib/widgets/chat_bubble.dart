import 'package:flutter/material.dart';
import '../models/chat_message.dart';

/// Widget Bubble Chat di Flutter dengan dukungan Reply Box & Reaction Parser
class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isSelf;
  final VoidCallback? onReplyTap;
  final Function(String emoji)? onReactionTap;

  const ChatBubble({
    super.key,
    required this.message,
    this.isSelf = false,
    this.onReplyTap,
    this.onReactionTap,
  });

  @override
  Widget build(BuildContext context) {
    final isMe = isSelf || message.isSelf;
    const primaryGreen = Color(0xFF5FA874);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.78,
        ),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFE8F5E9) : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 2),
            bottomRight: Radius.circular(isMe ? 2 : 16),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
          border: Border.all(
            color: isMe ? const Color(0xFFC8E6C9) : const Color(0xFFEEEEEE),
            width: 1,
          ),
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Nama Pengirim (jika bukan pesan sendiri)
            if (!isMe && message.senderName.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  message.senderName,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: primaryGreen,
                  ),
                ),
              ),

            // 2. Kotak Preview Balasan (Reply Box) jika message.replyTo != null
            if (message.replyTo != null) _buildReplyBox(primaryGreen),

            // Teks Pesan Utama
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Text(
                message.text,
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF1E293B),
                  height: 1.35,
                ),
              ),
            ),

            // Jam & Tanda Centang
            Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Spacer(),
                Text(
                  message.time ?? '',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.done_all,
                    size: 14,
                    color: primaryGreen,
                  ),
                ],
              ],
            ),

            // 3. Parser Reaksi di Flutter (Hitung panjang list: reactions[emoji]?.length ?? 0)
            if (message.reactions.isNotEmpty)
              _buildReactionsRow(primaryGreen),
          ],
        ),
      ),
    );
  }

  /// 2. Kotak preview balasan (Reply Box) di atas teks pesan pada bubble:
  /// Jika message.replyTo != null, tampilkan Container kecil bergaris tepi hijau yang memuat replyTo['senderName'] dan replyTo['text'].
  Widget _buildReplyBox(Color accentColor) {
    final replySender = message.replyTo?['senderName'] ??
        message.replyTo?['sender_name'] ??
        message.replyTo?['fromName'] ??
        'Balasan Pesan';
    final replyText = message.replyTo?['text'] ??
        message.replyTo?['content'] ??
        '';

    return GestureDetector(
      onTap: onReplyTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F8F4),
          borderRadius: BorderRadius.circular(8),
          border: Border(
            left: BorderSide(
              color: accentColor,
              width: 3.5,
            ),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              replySender.toString(),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: accentColor,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              replyText.toString(),
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  /// 3. Parser Reaksi di Flutter:
  /// Hitung reaksi berdasarkan panjang list: `reactions[emoji]?.length ?? 0` agar tidak bertambah berlipat ganda.
  Widget _buildReactionsRow(Color accentColor) {
    final activeReactions = message.reactions.entries
        .where((entry) => entry.value.isNotEmpty)
        .toList();

    if (activeReactions.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: activeReactions.map((entry) {
          final emoji = entry.key;
          // Hitung reaksi berdasarkan panjang list: reactions[emoji]?.length ?? 0
          final count = message.reactions[emoji]?.length ?? 0;

          return InkWell(
            onTap: () => onReactionTap?.call(emoji),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFFE2E8F0),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    emoji,
                    style: const TextStyle(fontSize: 13),
                  ),
                  if (count > 0) ...[
                    const SizedBox(width: 3),
                    Text(
                      '$count',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF475569),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
