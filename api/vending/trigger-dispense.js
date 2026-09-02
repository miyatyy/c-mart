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
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now, expires: 60 }
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
    const { orderId, productName, buyerName, slotNumber } = req.body || req.query || {};

    const newQueue = await VendingQueue.create({
      orderId: orderId || `ANTASARI-${Date.now()}`,
      productName: productName || "Blind Bag Mystery Ganci",
      buyerName: buyerName || "Mahasiswa UIN Antasari",
      slotNumber: parseInt(slotNumber) || 1,
      status: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: "Antrean Vending berhasil disimpan di MongoDB Atlas Cloud!",
      queueId: newQueue._id
    });
  } catch (err) {
    console.error("Vending trigger error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
