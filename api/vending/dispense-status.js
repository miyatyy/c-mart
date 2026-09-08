import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://mnurmiyaty2_db_user:cMl6nchCoKKZUrTh@cluster0.krmxt4t.mongodb.net/Antasari_Mart_Chat?retryWrites=true&w=majority&appName=Cluster0";

let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  cachedDb = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  return cachedDb;
}

const VendingQueueSchema = new mongoose.Schema({
  orderId: String,
  productName: String,
  buyerName: String,
  slotNumber: Number,
  quantity: { type: Number, default: 1 },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now, expires: 120 }
});

const VendingQueue = mongoose.models.VendingQueue || mongoose.model('VendingQueue', VendingQueueSchema);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();
    
    const recentTime = new Date(Date.now() - 60000);
    const pending = await VendingQueue.findOne({
      status: 'pending',
      createdAt: { $gte: recentTime }
    }).sort({ createdAt: -1 });

    if (pending) {
      if (req.query.claim === 'true') {
        pending.status = 'claimed';
        await pending.save();
      }
      return res.status(200).json({
        hasPendingDispense: true,
        shouldDispense: true,
        orderId: pending.orderId || "VEND-88219",
        slotNumber: pending.slotNumber || 1,
        quantity: pending.quantity || 1,
        qty: pending.quantity || 1,
        productName: pending.productName || "Blind Bag Mystery Ganci",
        buyerName: pending.buyerName || "Mahasiswa UIN Antasari"
      });
    }

    return res.status(200).json({ hasPendingDispense: false, shouldDispense: false });
  } catch (err) {
    console.error("Vending status error:", err);
    return res.status(200).json({ hasPendingDispense: false, shouldDispense: false, error: err.message });
  }
}
