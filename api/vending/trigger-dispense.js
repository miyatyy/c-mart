export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { orderId, productName, buyerName, slotNumber } = req.body || req.query || {};

  global.activePendingDispense = {
    orderId: orderId || `ANTASARI-${Date.now()}`,
    productName: productName || "Blind Bag Mystery Ganci",
    buyerName: buyerName || "Mahasiswa UIN Antasari",
    slotNumber: parseInt(slotNumber) || 1
  };
  global.lastDispenseTimestamp = Date.now();

  return res.status(200).json({
    success: true,
    message: "Sinyal pengeluaran barang berhasil dikirim ke ESP32 Vending Machine!",
    data: global.activePendingDispense
  });
}
