require('dotenv').config();
const nodemailer = require('nodemailer');

const user = process.env.EMAIL_SERVICE_USER || 'mnurmiyaty2@gmail.com';
const pass = (process.env.EMAIL_SERVICE_PASS || '').replace(/\s+/g, '');

console.log('Testing SMTP with User:', user, 'Password length:', pass.length);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass
  }
});

async function main() {
  try {
    console.log('Verifying SMTP connection...');
    const verified = await transporter.verify();
    console.log('✅ SMTP Connection verified successfully:', verified);

    const info = await transporter.sendMail({
      from: `"Antasari Mart Super Admin" <${user}>`,
      to: 'mnurmiyaty2@gmail.com',
      subject: '📜 [UJI COBA RESMI] Laporan Rekapitulasi Audit Log Bulanan Antasari Mart',
      html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 12px; max-width: 600px; margin: auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #10B981; margin: 0; font-size: 24px;">👑 ANTASARI MART SUPER ADMIN</h1>
          <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0;">Sistem Rekapitulasi Otomatis & PostgreSQL Audit Log</p>
        </div>
        <div style="background: #1e293b; padding: 18px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 16px;">
          <h3 style="color: #38BDF8; margin-top: 0;">✨ Uji Coba Pengiriman Rekap Audit Log Berhasil!</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">
            Halo Super Admin <strong>Nurmiyaty</strong>, email ini membuktikan bahwa integrasi SMTP Gmail untuk sistem <strong>Antasari Mart</strong> telah aktif 100% dan terhubung secara langsung ke kotak masuk Gmail Anda.
          </p>
          <ul style="font-size: 13px; color: #cbd5e1; line-height: 1.8;">
            <li>📅 <strong>Jadwal Otomatis:</strong> Setiap Tanggal 1 Pukul 00:00 WITA</li>
            <li>🐘 <strong>Database:</strong> PostgreSQL & pgAdmin Audit Log</li>
            <li>📄 <strong>Format Dokumen:</strong> Rekap Eksekutif Aktivitas Seluruh Role (Mahasiswa, Penjual, Driver, & Admin)</li>
            <li>🧹 <strong>Auto-Purge:</strong> Pembersihan otomatis log bulan lalu untuk menjaga database tetap ringan (0 KB wasted)</li>
          </ul>
        </div>
        <p style="text-align: center; font-size: 11px; color: #64748b; margin: 0;">
          UIN Antasari Banjarmasin & Banjarbaru • © 2026 Antasari Mart Eco-System
        </p>
      </div>
      `
    });

    console.log('🎉 Email sent successfully! Message ID:', info.messageId, 'Response:', info.response);
  } catch (err) {
    console.error('❌ Error testing email:', err);
  }
}

main();
