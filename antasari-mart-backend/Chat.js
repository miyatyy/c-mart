const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  fromId: { type: String, required: true },
  fromName: { type: String, required: true },
  fromRole: { type: String, required: true },
  toId: { type: String, required: true },
  toName: { type: String, required: true },
  toRole: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Chat', chatSchema);