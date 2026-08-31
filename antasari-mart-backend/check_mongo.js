const mongoose = require('mongoose');
require('dotenv').config({ path: 'C:/Users/nurmi/Documents/project-antasari-mart/antasari-mart-backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Antasari_Mart_Chat';

const MongoChatSchema = new mongoose.Schema({
  roomId: String,
  senderId: String,
  senderName: String,
  senderRole: String,
  receiverId: String,
  receiverName: String,
  receiverRole: String,
  text: String,
  time: String,
  isRead: Boolean,
  isHandedOver: Boolean,
  createdAt: Date
});

const MongoChat = mongoose.models.MongoChat || mongoose.model('MongoChat', MongoChatSchema);

async function checkMongoDB() {
  console.log('🍃 Menghubungkan ke MongoDB URI:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ Terhubung ke database MongoDB:', mongoose.connection.name);

    const chats = await MongoChat.find().sort({ createdAt: -1 });
    console.log(`\n📊 Total Pesan di MongoDB: ${chats.length} dokumen\n`);

    if (chats.length === 0) {
      console.log('ℹ️ Belum ada data chat yang tersimpan (atau baru saja dibersihkan jadwal 00:00 WITA).');
    } else {
      console.table(chats.map(c => ({
        ID: String(c._id).slice(-6),
        Dari: c.senderName,
        Ke: c.receiverName,
        Pesan: c.text.length > 30 ? c.text.slice(0, 30) + '...' : c.text,
        Jam: c.time,
        Handover: c.isHandedOver ? '🤝 Admin' : '🤖 AI'
      })));
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal terhubung ke MongoDB:', err.message);
    console.log('\n💡 Tips: Pastikan service MongoDB atau MongoDB Compass sudah terinstal dan aktif di port 27017.');
    process.exit(1);
  }
}

checkMongoDB();
