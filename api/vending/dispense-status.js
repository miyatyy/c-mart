let pendingDispense = null;
let lastDispenseTime = 0;

export default function handler(req, res) {
  // Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Cek apakah ada antrean pengeluaran aktif dalam 30 detik terakhir
  if (global.activePendingDispense && (Date.now() - global.lastDispenseTimestamp) < 30000) {
    const data = { ...global.activePendingDispense };
    // Jika requested dengan parameter markClaimed=true atau setelah dibaca oleh ESP32
    if (req.query.claim === 'true') {
      global.activePendingDispense = null;
    }
    return res.status(200).json({
      hasPendingDispense: true,
      orderId: data.orderId || "VEND-88219",
      slotNumber: data.slotNumber || 1,
      productName: data.productName || "Blind Bag Mystery Ganci",
      buyerName: data.buyerName || "Mahasiswa UIN",
      timestamp: global.lastDispenseTimestamp
    });
  }

  return res.status(200).json({ hasPendingDispense: false });
}
