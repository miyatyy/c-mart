import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface VendingQRCodeProps {
  transactionToken: string; // Token unik dari transaksi, contoh: "ANTASARI-TRX-12345"
  productName: string;
  slotNumber: number;
}

export const VendingQRCode: React.FC<VendingQRCodeProps> = ({
  transactionToken,
  productName,
  slotNumber,
}) => {

  // Data JSON yang akan dibaca oleh Scanner Vending Machine
  const qrData = JSON.stringify({
    token: transactionToken,
    slot: slotNumber,
    type: 'VENDING_CLAIM',
  });

  return (
    <div style={{ textAlign: 'center', padding: '20px', border: '1px solid #ddd', borderRadius: '12px' }}>
      <h3>Scan QR di Vending Machine</h3>
      <p>Arahkan QR Code ini ke kamera/scanner mesin untuk mengambil <b>{productName}</b></p>
      
      <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '8px' }}>
        <QRCodeSVG value={qrData} size={220} level="H" />
      </div>

      <p style={{ fontSize: '12px', color: '#666', marginTop: '12px' }}>
        Kode Token: <code>{transactionToken}</code>
      </p>
    </div>
  );
};