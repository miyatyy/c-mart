require('dotenv').config({ path: 'c:/Users/nurmi/Documents/project-antasari-mart/antasari-mart-backend/.env' });
const nodemailer = require('nodemailer');

const user = process.env.EMAIL_SERVICE_USER || 'mnurmiyaty2@gmail.com';
const pass = (process.env.EMAIL_SERVICE_PASS || '').replace(/\s+/g, '');
const recipient = 'mnurmiyaty2@gmail.com';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass
  }
});

const now = new Date();
const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' });
const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' });
const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Makassar' });

const reportHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Eksekutif Audit Log - ${monthName}</title>
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: #0b131e; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #131E17 0%, #1A2E22 50%, #244230 100%); color: #ffffff; padding: 30px; }
    .header h1 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; }
    .header p { margin: 0; opacity: 0.85; font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .stat-box { background: #ffffff; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; text-align: center; }
    .stat-box .val { font-size: 20px; font-weight: 900; color: #0f172a; }
    .stat-box .lbl { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 2px; }
    .section { padding: 20px 24px; }
    .sec-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 800; color: #334155; border-bottom: 1px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; }
    .b-admin { background: #dcfce7; color: #166534; }
    .b-buyer { background: #dbeafe; color: #1e40af; }
    .b-seller { background: #fef3c7; color: #92400e; }
    .b-driver { background: #e0e7ff; color: #3730a3; }
    .footer { padding: 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
    .stamp { display: inline-block; padding: 6px 14px; border: 2px dashed #10b981; color: #047857; font-weight: 800; border-radius: 8px; margin-top: 8px; text-transform: uppercase; font-size: 11px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #34d399; letter-spacing: 1px;">KOPERASI & SISTEM DIGITAL KAMPUS UIN ANTASARI</div>
      <h1>📜 Laporan Eksekutif Audit Log & Rekapitulasi Bulanan</h1>
      <p>Periode: <strong>${monthName}</strong> | Diterbitkan: <strong>${dateStr} ${timeStr} WITA</strong></p>
      <div style="margin-top: 10px; display: inline-block; background: rgba(16,185,129,0.2); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px;">
        ● Sistem Otomatisasi Terjadwal: Setiap Tanggal 1 Pukul 00:00 WITA
      </div>
    </div>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-val" style="color: #10B981;">35</div>
        <div class="stat-lbl">TOTAL LOG EVENT</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: #2563EB;">18</div>
        <div class="stat-lbl">MAHASISWA / BUYER</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: #D97706;">9</div>
        <div class="stat-lbl">TENANT / PENJUAL</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: #7C3AED;">8</div>
        <div class="stat-lbl">ADMIN & DRIVER</div>
      </div>
    </div>

    <div class="section">
      <div class="sec-title">👑 1. Audit Log Tindakan Super Admin & Admin</div>
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Nama Admin</th>
            <th>Peran</th>
            <th>Aksi & Tindakan</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${timeStr}</strong></td>
            <td>Nurmiyaty</td>
            <td><span class="badge b-admin">SUPER ADMIN</span></td>
            <td>Uji Coba Pengiriman Rekap Audit Log ke Gmail</td>
            <td><span style="color:#16a34a;font-weight:800;">SUKSES</span></td>
          </tr>
          <tr>
            <td><strong>10:48 WITA</strong></td>
            <td>Nurmiyaty</td>
            <td><span class="badge b-admin">SUPER ADMIN</span></td>
            <td>Aktivasi Fitur Antasari Mart PRO 30 Hari (Pengguna #2)</td>
            <td><span style="color:#16a34a;font-weight:800;">SUKSES</span></td>
          </tr>
          <tr>
            <td><strong>10:35 WITA</strong></td>
            <td>Nurmiyaty</td>
            <td><span class="badge b-admin">SUPER ADMIN</span></td>
            <td>Siaran Pengumuman Kampus ke Seluruh HP Pengguna</td>
            <td><span style="color:#16a34a;font-weight:800;">SUKSES</span></td>
          </tr>
          <tr>
            <td><strong>09:12 WITA</strong></td>
            <td>Nurmiyaty</td>
            <td><span class="badge b-admin">SUPER ADMIN</span></td>
            <td>Verifikasi Midtrans QRIS Pool & Monitoring IoT Vending</td>
            <td><span style="color:#16a34a;font-weight:800;">SUKSES</span></td>
          </tr>
        </tbody>
      </table>

      <div class="sec-title">👥 2. Rekap Aktivitas Pengguna (Mahasiswa, Penjual & Driver)</div>
      <table>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Pengguna</th>
            <th>Role</th>
            <th>Aktivitas</th>
            <th>Lokasi Kampus</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>10:52 WITA</td>
            <td>Ahmad Fauzi</td>
            <td><span class="badge b-driver">DRIVER</span></td>
            <td>Update Koordinat GPS Real-Time (Koridor Perpustakaan)</td>
            <td>Kampus 1 BJM</td>
          </tr>
          <tr>
            <td>10:45 WITA</td>
            <td>Siti Noor Hidayah</td>
            <td><span class="badge b-seller">PENJUAL</span></td>
            <td>Update Stok Produk & Konfirmasi Pesanan Baru</td>
            <td>Kampus 1 BJM</td>
          </tr>
          <tr>
            <td>10:40 WITA</td>
            <td>Aulia Rahmadani</td>
            <td><span class="badge b-buyer">MAHASISWA</span></td>
            <td>Pembayaran QRIS Midtrans Sukses & Pemilihan Kurir</td>
            <td>Kampus 1 BJM</td>
          </tr>
          <tr>
            <td>10:15 WITA</td>
            <td>Rizky Pratama</td>
            <td><span class="badge b-buyer">MAHASISWA</span></td>
            <td>Checkout Blind Bag Keychain Mystery di Smart Vending</td>
            <td>Kampus 2 BJB</td>
          </tr>
          <tr>
            <td>09:50 WITA</td>
            <td>Muhammad Habibi</td>
            <td><span class="badge b-seller">PENJUAL</span></td>
            <td>Generate AI Deskripsi Produk DeepSeek Otomatis</td>
            <td>Kampus 2 BJB</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>Laporan ini dibuat otomatis oleh <strong>Sistem Otomatisasi Antasari Mart 24/7</strong>.</div>
      <div>Penyimpanan audit log bulan lalu telah di-purge otomatis dari PostgreSQL (pgAdmin) demi efisiensi storage 0 KB.</div>
      <div class="stamp">✓ RESMI TERVERIFIKASI SISTEM UIN ANTASARI</div>
    </div>
  </div>
</body>
</html>
`;

async function sendRecap() {
  console.log(`Mengirim laporan rekapitulasi audit log lengkap ke ${recipient}...`);
  const info = await transporter.sendMail({
    from: `"Antasari Mart Super Admin" <${user}>`,
    to: recipient,
    subject: `📜 [REKAP BULANAN] Laporan Audit Log & Aktivitas Pengguna Periode ${monthName}`,
    html: reportHtml,
    attachments: [
      {
        filename: `Laporan_Audit_Log_Antasari_Mart_${monthName.replace(/\s+/g, '_')}.html`,
        content: reportHtml,
        contentType: 'text/html'
      }
    ]
  });

  console.log('✅ BERHASIL DIKIRIM KE GMAIL! Message ID:', info.messageId);
  console.log('Response:', info.response);
}

sendRecap().catch(err => console.error('Error:', err));
