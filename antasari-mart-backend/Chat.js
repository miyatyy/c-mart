const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  fromId: { type: String, required: true },
  fromName: { type: String, required: true },
  fromRole: { type: String, required: true },
  toId: { type: String, required: true },
  toName: { type: String, required: true },
  toRole: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', chatSchema);