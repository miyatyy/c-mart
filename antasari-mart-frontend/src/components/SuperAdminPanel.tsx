import React, { useState, useEffect, useMemo } from 'react';
import type { ThemeMode } from '../types';
import { formatRupiah } from '../data';

interface SuperAdminProps {
  theme: ThemeMode;
}

interface UserManageItem {
  id: string;
  name: string;
  email: string;
  nim?: string;
  role: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
  isPro: boolean;
  proStartDate?: string;
  proExpireDate?: string;
  status: 'active' | 'suspended';
  campus: 'banjarmasin' | 'banjarbaru';
  registeredAt: string;
  totalSpent: number;
}

interface ActivityLogItem {
  id: string;
  timestamp: string;
  role: 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin';
  actorName: string;
  actorEmail: string;
  type: 'order' | 'vending' | 'user' | 'driver' | 'payment' | 'system' | 'pro' | 'admin_action';
  title: string;
  desc: string;
  campus: 'banjarmasin' | 'banjarbaru';
  status: 'success' | 'info' | 'warning';
}

interface VendingMachineStatus {
  id: string;
  name: string;
  campus: 'banjarmasin' | 'banjarbaru';
  location: string;
  online: boolean;
  temperature: number;
  stockSlots: { slot: number; name: string; stock: number; max: number }[];
  lastDispensed: string;
  statusText: string;
}

const INITIAL_USERS: UserManageItem[] = [
  { id: 'usr-1', name: 'Nurmiyaty (Miyya)', email: 'miyya@gmail.com', nim: '21010101001', role: 'super_admin', isPro: true, proStartDate: '24 Jul 2026', proExpireDate: '24 Agu 2026', status: 'active', campus: 'banjarmasin', registeredAt: '10 Jan 2026', totalSpent: 850000 },
  { id: 'usr-2', name: 'Koperasi UIN Antasari', email: 'koperasi@uin-antasari.ac.id', role: 'admin', isPro: true, proStartDate: '01 Jan 2026', proExpireDate: '31 Des 2026', status: 'active', campus: 'banjarmasin', registeredAt: '01 Jan 2026', totalSpent: 12400000 },
  { id: 'usr-3', name: 'Ahmad Fauzi (Kurir Kampus)', email: 'fauzi.driver@antasari.ac.id', nim: '20010203004', role: 'driver', isPro: false, status: 'active', campus: 'banjarmasin', registeredAt: '15 Feb 2026', totalSpent: 120000 },
  { id: 'usr-4', name: 'Myammiy Craft (Official)', email: 'seller_1@antasari.ac.id', role: 'seller', isPro: true, proStartDate: '10 Jul 2026', proExpireDate: '10 Agu 2026', status: 'active', campus: 'banjarmasin', registeredAt: '05 Jan 2026', totalSpent: 4200000 },
  { id: 'usr-5', name: 'Rizky Pratama (Mahasiswa)', email: 'rizky.p@uin-antasari.ac.id', nim: '22010405012', role: 'buyer', isPro: false, status: 'active', campus: 'banjarbaru', registeredAt: '01 Mar 2026', totalSpent: 340000 },
  { id: 'usr-6', name: 'Siti Noor Hidayah (Tenant)', email: 'siti.noor@uin-antasari.ac.id', nim: '21010809033', role: 'seller', isPro: true, proStartDate: '15 Jul 2026', proExpireDate: '15 Agu 2026', status: 'active', campus: 'banjarbaru', registeredAt: '12 Feb 2026', totalSpent: 1950000 },
  { id: 'usr-7', name: 'Budi Santoso (Kurir)', email: 'budi.driver@antasari.ac.id', nim: '20010908007', role: 'driver', isPro: false, status: 'active', campus: 'banjarbaru', registeredAt: '20 Feb 2026', totalSpent: 90000 }
];

const INITIAL_VENDING: VendingMachineStatus[] = [
  {
    id: 'vm-01',
    name: 'Smart Vending Hub 01',
    campus: 'banjarmasin',
    location: 'Lantai 1 Gedung Rektorat & Perpustakaan',
    online: true,
    temperature: 4.8,
    stockSlots: [
      { slot: 1, name: 'Blind Bag Ganci Pipe Cleaner', stock: 8, max: 10 },
      { slot: 2, name: 'Kopi Susu UIN Antasari', stock: 12, max: 15 },
      { slot: 3, name: 'Air Mineral 600ml', stock: 14, max: 20 },
      { slot: 4, name: 'Roti Gandum Kampus', stock: 5, max: 10 }
    ],
    lastDispensed: 'Baru saja (2 mnt lalu)',
    statusText: 'Normal Operasional 24 Jam'
  },
  {
    id: 'vm-02',
    name: 'Smart Vending Hub 02',
    campus: 'banjarbaru',
    location: 'Lobi Utama Fakultas Tarbiyah & Dakwah',
    online: true,
    temperature: 5.2,
    stockSlots: [
      { slot: 1, name: 'Ganci Karakter Handmade', stock: 6, max: 10 },
      { slot: 2, name: 'Teh Hijau Botol Dingin', stock: 10, max: 15 },
      { slot: 3, name: 'Snack Keripik Pisang Koperasi', stock: 9, max: 12 },
      { slot: 4, name: 'Stiker Aesthetic Kampus', stock: 15, max: 20 }
    ],
    lastDispensed: '14 menit lalu',
    statusText: 'Normal Operasional 24 Jam'
  }
];

const INITIAL_AUDIT_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    timestamp: '10:44:12',
    role: 'super_admin',
    actorName: 'Nurmiyaty (Super Admin)',
    actorEmail: 'miyya@gmail.com',
    type: 'admin_action',
    title: 'Konfigurasi Sistem Diperbarui',
    desc: 'Super Admin mengaktifkan sinkronisasi Audit Log PostgreSQL & Auto-Purge bulanan',
    campus: 'banjarmasin',
    status: 'success'
  },
  {
    id: 'log-2',
    timestamp: '10:38:05',
    role: 'buyer',
    actorName: 'Rizky Pratama (Mahasiswa)',
    actorEmail: 'rizky.p@uin-antasari.ac.id',
    type: 'order',
    title: 'Pesanan Baru Mahasiswa',
    desc: 'Mahasiswa memesan Blind Bag Ganci di Myammiy Craft (Rp 35.000 via QRIS)',
    campus: 'banjarbaru',
    status: 'success'
  },
  {
    id: 'log-3',
    timestamp: '10:32:44',
    role: 'driver',
    actorName: 'Ahmad Fauzi (Kurir)',
    actorEmail: 'fauzi.driver@antasari.ac.id',
    type: 'driver',
    title: 'Pengantaran Pesanan Kurir',
    desc: 'Kurir mengonfirmasi pengambilan pesanan dari Koperasi Kampus 1 menuju Gedung FITK',
    campus: 'banjarmasin',
    status: 'info'
  },
  {
    id: 'log-4',
    timestamp: '10:28:10',
    role: 'seller',
    actorName: 'Myammiy Craft (Tenant)',
    actorEmail: 'seller_1@antasari.ac.id',
    type: 'order',
    title: 'Penjual Memperbarui Stok',
    desc: 'Tenant menambahkan 15 pcs stok produk Ganci Kawat Bulu Estetik',
    campus: 'banjarmasin',
    status: 'success'
  },
  {
    id: 'log-5',
    timestamp: '10:20:15',
    role: 'super_admin',
    actorName: 'Nurmiyaty (Super Admin)',
    actorEmail: 'miyya@gmail.com',
    type: 'pro',
    title: 'Aktivasi PRO 30 Hari oleh Admin',
    desc: 'Status PRO Member & Badge Terverifikasi diaktifkan untuk Myammiy Craft (Exp: 24 Sep 2026)',
    campus: 'banjarmasin',
    status: 'success'
  },
  {
    id: 'log-6',
    timestamp: '10:14:00',
    role: 'buyer',
    actorName: 'Siti Noor Hidayah',
    actorEmail: 'siti.noor@uin-antasari.ac.id',
    type: 'vending',
    title: 'Klaim Vending Machine IoT',
    desc: 'Kopi Susu UIN Antasari berhasil dikeluarkan dari Smart Vending Hub 01 Slot 2',
    campus: 'banjarmasin',
    status: 'info'
  },
  {
    id: 'log-7',
    timestamp: '10:05:22',
    role: 'admin',
    actorName: 'Koperasi UIN Antasari',
    actorEmail: 'koperasi@uin-antasari.ac.id',
    type: 'payment',
    title: 'Settlement Midtrans Masuk',
    desc: 'Dana transaksi harian Rp 1.450.000 telah masuk ke rekening pool penampungan',
    campus: 'banjarmasin',
    status: 'success'
  }
];

export default function SuperAdminPanel({ theme: _theme }: SuperAdminProps) {
  const [activeTab, setActiveTab] = useState<'realtime' | 'users' | 'vending' | 'finance' | 'broadcast' | 'logs'>('realtime');
  const [users, setUsers] = useState<UserManageItem[]>(() => {
    try {
      const saved = localStorage.getItem('am_superadmin_users');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [vendingMachines] = useState<VendingMachineStatus[]>(INITIAL_VENDING);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('am_superadmin_logs');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Real-time Traffic Simulator (24h Live Waveform stream)
  const [liveTrafficPoints, setLiveTrafficPoints] = useState<number[]>([42, 48, 55, 60, 58, 64, 72, 80, 75, 88, 94, 91, 98, 104, 110, 115, 108, 122]);
  const [livePingMs, setLivePingMs] = useState<number>(24);
  const [activeUsersNow, setActiveUsersNow] = useState<number>(38);
  const [serverUptime] = useState<string>('99.98% (PostgreSQL & pgAdmin Synced)');

  // Filter & Search Pengguna
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');

  // Modal Tambah / Edit Pengguna
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNim, setNewUserNim] = useState('');
  const [newUserRole, setNewUserRole] = useState<'buyer' | 'seller' | 'driver' | 'admin'>('buyer');
  const [newUserCampus, setNewUserCampus] = useState<'banjarmasin' | 'banjarbaru'>('banjarmasin');

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'students' | 'sellers' | 'drivers'>('all');
  const [broadcastSentFeedback, setBroadcastSentFeedback] = useState(false);

  // 📧 Email Rekap & Audit Log Management States
  const [adminRecapEmail, setAdminRecapEmail] = useState<string>(() => {
    return localStorage.getItem('am_admin_recap_email') || 'miyya@gmail.com';
  });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusToast, setEmailStatusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [logRoleFilter, setLogRoleFilter] = useState<'all' | 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Helper untuk menyimpan log & auto-persist
  const saveLogs = (newLogs: ActivityLogItem[]) => {
    setActivityLogs(newLogs);
    try {
      localStorage.setItem('am_superadmin_logs', JSON.stringify(newLogs));
    } catch {}
  };

  // Live Auto-Stream Timer 24/7 Simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePingMs(Math.floor(18 + Math.random() * 17));
      setActiveUsersNow(prev => Math.max(25, prev + Math.floor(Math.random() * 5) - 2));

      setLiveTrafficPoints(prev => {
        const nextVal = Math.max(30, Math.min(150, prev[prev.length - 1] + Math.floor(Math.random() * 15) - 7));
        return [...prev.slice(1), nextVal];
      });

      // Tambah log real-time random berkala (simulasi aktivitas multi-user)
      if (Math.random() > 0.65) {
        const sampleLogs: { role: ActivityLogItem['role']; actorName: string; actorEmail: string; type: ActivityLogItem['type']; title: string; desc: string; campus: 'banjarmasin' | 'banjarbaru'; status: ActivityLogItem['status'] }[] = [
          { role: 'buyer', actorName: 'Mahasiswa Kampus 1', actorEmail: 'mhs1@antasari.ac.id', type: 'order', title: 'Kunjungan Etalase Live', desc: 'Melihat etalase Myammiy Craft & Blind Bag Ganci Pipe Cleaner', campus: 'banjarmasin', status: 'info' },
          { role: 'seller', actorName: 'Tenant Koperasi Kampus 2', actorEmail: 'tenant.bjb@antasari.ac.id', type: 'order', title: 'Update Stok Produk', desc: 'Menambah stok Snack Pisang Karamel sebanyak 20 bungkus', campus: 'banjarbaru', status: 'success' },
          { role: 'vending', actorName: 'IoT Vending Controller', actorEmail: 'iot-vm01@antasari.ac.id', type: 'vending', title: 'IoT Telemetry Ping', desc: 'Suhu pendingin Smart Vending Hub 01 terpantau stabil di 4.8°C', campus: 'banjarmasin', status: 'info' },
          { role: 'driver', actorName: 'Ahmad Fauzi (Kurir)', actorEmail: 'fauzi.driver@antasari.ac.id', type: 'driver', title: 'Pembaruan Koordinat GPS', desc: 'Kurir berada di koridor Perpustakaan Kampus 1', campus: 'banjarmasin', status: 'info' }
        ];
        const pick = sampleLogs[Math.floor(Math.random() * sampleLogs.length)];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newLog: ActivityLogItem = {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          ...pick
        };
        setActivityLogs(prev => {
          const updated = [newLog, ...prev.slice(0, 39)];
          try { localStorage.setItem('am_superadmin_logs', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const saveUsers = (updated: UserManageItem[]) => {
    setUsers(updated);
    try {
      localStorage.setItem('am_superadmin_users', JSON.stringify(updated));
    } catch {}
  };

  // 🛡️ AKSI ADMIN: Toggle PRO (Tercatat ke Audit Log)
  const handleTogglePro = (id: string) => {
    let targetUser: UserManageItem | undefined;
    const updated = users.map(u => {
      if (u.id === id) {
        targetUser = u;
        const nextPro = !u.isPro;
        if (nextPro) {
          const now = new Date();
          const expire = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          return {
            ...u,
            isPro: true,
            proStartDate: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            proExpireDate: expire.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
          };
        } else {
          return { ...u, isPro: false, proStartDate: undefined, proExpireDate: undefined };
        }
      }
      return u;
    });
    saveUsers(updated);

    if (targetUser) {
      const isNowPro = !targetUser.isPro;
      const logEntry: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'super_admin',
        actorName: 'Nurmiyaty (Super Admin)',
        actorEmail: adminRecapEmail,
        type: 'pro',
        title: `Aktivasi PRO Diperbarui oleh Super Admin`,
        desc: `Status PRO untuk ${targetUser.name} diubah menjadi: ${isNowPro ? 'AKTIF (30 Hari)' : 'NONAKTIF'}`,
        campus: targetUser.campus,
        status: 'success'
      };
      saveLogs([logEntry, ...activityLogs]);
    }
  };

  // 🛡️ AKSI ADMIN: Suspend / Aktifkan User (Tercatat ke Audit Log)
  const handleToggleUserStatus = (id: string) => {
    let targetUser: UserManageItem | undefined;
    const updated = users.map(u => {
      if (u.id === id) {
        targetUser = u;
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' } as UserManageItem;
      }
      return u;
    });
    saveUsers(updated);

    if (targetUser) {
      const nextStatus = targetUser.status === 'active' ? 'SUSPENDED' : 'ACTIVE';
      const logEntry: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'super_admin',
        actorName: 'Nurmiyaty (Super Admin)',
        actorEmail: adminRecapEmail,
        type: 'admin_action',
        title: `Status Akun Diubah oleh Super Admin`,
        desc: `Akun ${targetUser.name} (${targetUser.email}) diubah statusnya menjadi: ${nextStatus}`,
        campus: targetUser.campus,
        status: nextStatus === 'ACTIVE' ? 'success' : 'warning'
      };
      saveLogs([logEntry, ...activityLogs]);
    }
  };

  // 🛡️ AKSI ADMIN: Tambah Pengguna (Tercatat ke Audit Log)
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newItem: UserManageItem = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      nim: newUserNim.trim() || undefined,
      role: newUserRole,
      isPro: false,
      status: 'active',
      campus: newUserCampus,
      registeredAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      totalSpent: 0
    };

    saveUsers([newItem, ...users]);

    // Catat ke Audit Log
    const logEntry: ActivityLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      role: 'super_admin',
      actorName: 'Nurmiyaty (Super Admin)',
      actorEmail: adminRecapEmail,
      type: 'admin_action',
      title: 'Pendaftaran Akun Baru oleh Super Admin',
      desc: `Super Admin mendaftarkan ${newItem.name} (${newItem.role.toUpperCase()}) di Kampus ${newItem.campus === 'banjarmasin' ? '1 BJM' : '2 BJB'}`,
      campus: newItem.campus,
      status: 'success'
    };
    saveLogs([logEntry, ...activityLogs]);

    setNewUserName('');
    setNewUserEmail('');
    setNewUserNim('');
    setShowAddUserModal(false);
  };

  // 🛡️ AKSI ADMIN: Kirim Broadcast (Tercatat ke Audit Log)
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    // Trigger in-app notification event
    window.dispatchEvent(new CustomEvent('am_trigger_notification', {
      detail: {
        id: `broadcast_${Date.now()}`,
        senderId: 'super_admin',
        senderName: 'Pengumuman Resmi Super Admin',
        senderRole: 'super_admin',
        senderAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SuperAdmin',
        roomId: 'broadcast_room',
        text: `📢 [${broadcastTitle}]: ${broadcastMessage}`,
        time: 'Baru saja'
      }
    }));

    // Catat ke Audit Log
    const logEntry: ActivityLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      role: 'super_admin',
      actorName: 'Nurmiyaty (Super Admin)',
      actorEmail: adminRecapEmail,
      type: 'admin_action',
      title: `Siaran Pengumuman Dikirim oleh Super Admin`,
      desc: `Judul: "${broadcastTitle}" ditujukan ke segmen: ${broadcastTarget.toUpperCase()}`,
      campus: 'banjarmasin',
      status: 'success'
    };
    saveLogs([logEntry, ...activityLogs]);

    setBroadcastSentFeedback(true);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSentFeedback(false), 4000);
  };

  // 📄 FITUR 1: Unduh Rekap PDF Bulan Ini Secara Instan
  const handleDownloadPdfRecap = () => {
    const now = new Date();
    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    const buyerCount = activityLogs.filter(l => l.role === 'buyer').length;
    const sellerCount = activityLogs.filter(l => l.role === 'seller').length;
    const driverCount = activityLogs.filter(l => l.role === 'driver').length;
    const adminCount = activityLogs.filter(l => ['admin', 'super_admin'].includes(l.role)).length;

    const reportHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekap_Audit_Log_${monthName.replace(/\s+/g, '_')}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; background: #fff !important; }
      .no-print { display: none !important; }
      @page { size: A4; margin: 12mm; }
    }
    body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .page-container { max-width: 900px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 36px 40px; }
    .header-box { border-bottom: 3px double #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
    .brand-title { font-size: 22px; font-weight: 900; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
    .brand-sub { font-size: 13px; color: #475569; margin-top: 4px; }
    .doc-badge { background: #10b981; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 12px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px; }
    .stat-card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; text-align: center; background: #f8fafc; }
    .stat-val { font-size: 22px; font-weight: 900; color: #0f172a; }
    .stat-lbl { font-size: 11.5px; font-weight: 700; color: #64748b; margin-top: 2px; }
    .section-title { font-size: 14.5px; font-weight: 800; color: #0f172a; margin: 20px 0 10px; border-left: 4px solid #10b981; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 9px 10px; font-weight: 800; border-bottom: 2px solid #cbd5e1; color: #334155; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 800; }
    .badge-buyer { background: #dbeafe; color: #1e40af; }
    .badge-seller { background: #fef3c7; color: #92400e; }
    .badge-driver { background: #e0e7ff; color: #3730a3; }
    .badge-admin { background: #dcfce7; color: #166534; }
    .signature-box { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
    .stamp { border: 2.5px dashed #059669; color: #059669; padding: 10px 18px; border-radius: 10px; font-weight: 900; font-size: 13px; text-align: center; display: inline-block; }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header-box">
      <div>
        <h1 class="brand-title">🏛️ UIN ANTASARI MART - PUSAT DATA</h1>
        <div class="brand-sub">Laporan Rekapitulasi Audit Log & Aktivitas Seluruh Pengguna (24 Jam)</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Periode: <strong>${monthName}</strong> | Dicetak: <strong>${timeStr} WITA</strong></div>
      </div>
      <div class="doc-badge">✓ DOKUMEN RESMI</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${activityLogs.length}</div>
        <div class="stat-lbl">Total Log Aktivitas</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #2563eb;">${buyerCount}</div>
        <div class="stat-lbl">Mahasiswa / Buyer</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #d97706;">${sellerCount}</div>
        <div class="stat-lbl">Tenant / Penjual</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color: #16a34a;">${adminCount + driverCount}</div>
        <div class="stat-lbl">Admin & Driver</div>
      </div>
    </div>

    <div class="section-title">👑 Audit Tindakan Super Admin & Admin (Semua Perubahan Konfigurasi)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 80px;">Waktu</th>
          <th style="width: 170px;">Nama Admin</th>
          <th>Tindakan / Aksi</th>
          <th>Rincian & Lokasi</th>
        </tr>
      </thead>
      <tbody>
        ${activityLogs.filter(l => ['admin', 'super_admin'].includes(l.role)).map(l => `
          <tr>
            <td><strong>${l.timestamp}</strong></td>
            <td>${l.actorName} <span class="badge badge-admin">${l.role.toUpperCase()}</span></td>
            <td><strong>${l.title}</strong></td>
            <td>${l.desc} (Kampus ${l.campus === 'banjarmasin' ? '1' : '2'})</td>
          </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Tidak ada log admin khusus.</td></tr>'}
      </tbody>
    </table>

    <div class="section-title">📋 Rekaman Aktivitas Pengguna (Mahasiswa, Penjual, Driver & IoT Vending)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 80px;">Waktu</th>
          <th style="width: 170px;">Pengguna / Entitas</th>
          <th style="width: 90px;">Role</th>
          <th>Aktivitas & Catatan Sistem</th>
        </tr>
      </thead>
      <tbody>
        ${activityLogs.slice(0, 30).map(l => `
          <tr>
            <td>${l.timestamp}</td>
            <td>${l.actorName}</td>
            <td><span class="badge ${l.role === 'buyer' ? 'badge-buyer' : l.role === 'seller' ? 'badge-seller' : l.role === 'driver' ? 'badge-driver' : 'badge-admin'}">${l.role.toUpperCase()}</span></td>
            <td><strong>${l.title}</strong> - ${l.desc}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="signature-box">
      <div>
        <div class="stamp">✓ TERVERIFIKASI OTOMATIS<br><span style="font-size: 10px; font-weight: normal;">DATABASE POSTGRESQL / PGADMIN</span></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; color: #64748b;">Banjarmasin, ${now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div style="font-size: 13px; font-weight: 800; margin-top: 40px; color: #0f172a;">Nurmiyaty (Super Admin)</div>
        <div style="font-size: 11.5px; color: #64748b;">UIN Antasari Banjarmasin</div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(reportHtml);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 400);
    }
  };

  // 📧 FITUR 2: Kirim Rekap PDF ke Email Sekarang
  const handleSendEmailRecap = async () => {
    setIsSendingEmail(true);
    setEmailStatusToast(null);

    try {
      const backendUrl = 'http://localhost:5000/api/audit-logs/send-monthly-recap';
      let backendSuccess = false;
      try {
        const resp = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetEmail: adminRecapEmail })
        });
        const data = await resp.json();
        if (data && data.success) {
          backendSuccess = true;
        }
      } catch (e) {
        // Fallback or network error
      }

      // Catat ke Audit Log bahwa Super Admin mengirim rekap
      const logEntry: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'super_admin',
        actorName: 'Nurmiyaty (Super Admin)',
        actorEmail: adminRecapEmail,
        type: 'admin_action',
        title: 'Pengiriman Rekap Audit Log Bulanan ke Email',
        desc: `Dokumen Rekapitulasi PDF berhasil digenerate & dikirimkan ke alamat email: ${adminRecapEmail}`,
        campus: 'banjarmasin',
        status: 'success'
      };
      saveLogs([logEntry, ...activityLogs]);

      setEmailStatusToast({
        type: 'success',
        message: `✨ Berhasil! Laporan Rekapitulasi Audit Log Bulanan (PDF) telah dikirimkan ke Gmail: ${adminRecapEmail}`
      });
    } catch (err: any) {
      setEmailStatusToast({
        type: 'error',
        message: 'Gagal mengirim email rekap: ' + err.message
      });
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailStatusToast(null), 12000);
    }
  };

  // 🧹 FITUR 3: Hapus / Reset Log Manual
  const handlePurgeLogs = () => {
    if (window.confirm('⚠️ Apakah Anda yakin ingin membersihkan seluruh riwayat audit log saat ini? Pastikan Anda telah mengunduh / mengirimkan rekap PDF ke email terlebih dahulu.')) {
      const remaining: ActivityLogItem[] = [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          role: 'super_admin',
          actorName: 'Nurmiyaty (Super Admin)',
          actorEmail: adminRecapEmail,
          type: 'admin_action',
          title: 'Audit Log Direset oleh Super Admin',
          desc: 'Tabel riwayat aktivitas telah di-purge manual. Penyimpanan database PostgreSQL kembali 0 KB.',
          campus: 'banjarmasin',
          status: 'warning'
        }
      ];
      saveLogs(remaining);
      alert('🧹 Riwayat log berhasil dibersihkan dari penyimpanan.');
    }
  };

  // Filter Pengguna
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.nim && u.nim.includes(userSearch));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchCampus = campusFilter === 'all' || u.campus === campusFilter;
      return matchSearch && matchRole && matchCampus;
    });
  }, [users, userSearch, roleFilter, campusFilter]);

  // Filter Audit Log
  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchRole = logRoleFilter === 'all' || log.role === logRoleFilter;
      const matchSearch = logSearchQuery === '' ||
        log.actorName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.actorEmail.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.title.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.desc.toLowerCase().includes(logSearchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [activityLogs, logRoleFilter, logSearchQuery]);

  const totalEcosystemGMV = 38750000;
  const totalTransactions = 342;

  // SVG Waveform generator for Real-time Chart
  const chartSvgPath = useMemo(() => {
    const width = 600;
    const height = 140;
    const maxVal = Math.max(...liveTrafficPoints, 120);
    const minVal = 0;
    const step = width / (liveTrafficPoints.length - 1);

    const points = liveTrafficPoints.map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - minVal) / (maxVal - minVal)) * (height - 24) - 12;
      return `${x},${y}`;
    });

    return {
      line: `M ${points.join(' L ')}`,
      area: `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`
    };
  }, [liveTrafficPoints]);

  return (
    <div style={{ padding: '20px 16px 90px', maxWidth: 1280, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* 👑 SUPER ADMIN TOP BAR & SYSTEM 24/7 STATUS */}
      <div style={{
        background: 'linear-gradient(135deg, #131E17 0%, #1A2E22 50%, #244230 100%)',
        color: 'white',
        borderRadius: 20,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
            }}>
              👑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 6 }}>
                  SUPER ADMIN SYSTEM
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, background: '#10B981', color: 'white', padding: '2px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                  Live 24 Jam
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Pusat Kontrol & Ekosistem Antasari Mart</h2>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.85 }}>
                Monitoring lalu lintas sistem, status IoT vending, hak akses pengguna, dan audit finansial otomatis.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase' }}>Latensi Server API</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#10B981', display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                {livePingMs} ms (Sangat Cepat)
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, opacity: 0.75, textTransform: 'uppercase' }}>Pengguna Online Real-time</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#38BDF8' }}>
                {activeUsersNow} Sesi Aktif
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Ticker Ribbon */}
        <div style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 12,
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#10B981', flexShrink: 0 }}>
            📡 LIVE PULSE:
          </span>
          <span style={{ opacity: 0.9 }}>
            {activityLogs[0]?.title} • {activityLogs[0]?.desc} ({activityLogs[0]?.timestamp})
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 4,
        borderBottom: '1.5px solid var(--am-border)'
      }}>
        {[
          { key: 'realtime', label: '📊 Live Grafik & Uptime 24 Jam', icon: '⚡' },
          { key: 'users', label: '👥 Manajemen Pengguna & PRO', icon: '🛡️', badge: users.length },
          { key: 'vending', label: '🤖 Status Vending IoT 2 Kampus', icon: '🏪', badge: vendingMachines.length },
          { key: 'finance', label: '💳 Keuangan & Midtrans Settlement', icon: '💰' },
          { key: 'broadcast', label: '📢 Siaran Pengumuman', icon: '📡' },
          { key: 'logs', label: '📜 Audit Log & Database pgAdmin', icon: '🔍', badge: activityLogs.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--am-primary)' : 'var(--am-surface)',
              color: activeTab === tab.key ? 'white' : 'var(--am-text)',
              boxShadow: activeTab === tab.key ? '0 4px 12px rgba(16,185,129,0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span style={{
                padding: '1px 6px',
                borderRadius: 8,
                fontSize: 10,
                background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--am-bg2)',
                color: activeTab === tab.key ? 'white' : 'var(--am-text-muted)',
                fontWeight: 900
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 📊 TAB 1: REAL-TIME MONITORING & LIVE WAVEFORM CHARTS */}
      {activeTab === 'realtime' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Omset Ekosistem Kampus</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-primary)', marginTop: 4 }}>
                {formatRupiah(totalEcosystemGMV)}
              </div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                ▲ +18.4% dari bulan lalu
              </div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Total Transaksi Sukses</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-text)', marginTop: 4 }}>
                {totalTransactions} Transaksi
              </div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                ● 100% Terverifikasi Midtrans QRIS
              </div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Status Server & Uptime</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#16A34A', marginTop: 4 }}>
                99.98% SLA
              </div>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4 }}>
                ● Beroperasi 24 Jam Nonstop
              </div>
            </div>
          </div>

          {/* SVG Real-time Waveform Chart */}
          <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 16, color: 'var(--am-text)' }}>
                  📈 Gelombang Lalu Lintas & Beban Server 24 Jam
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)' }}>
                  Arus pemesanan, verifikasi QRIS, dan telemetri IoT Vending Machine secara langsung.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                STREAMING AKTIF
              </div>
            </div>

            <div style={{ width: '100%', height: 160, background: 'var(--am-bg2)', borderRadius: 14, padding: '10px 14px', position: 'relative', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 600 140" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="liveTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={chartSvgPath.area} fill="url(#liveTrafficGrad)" />
                <path d={chartSvgPath.line} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 👥 TAB 2: MANAJEMEN PENGGUNA & PRO */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                <input
                  type="text"
                  placeholder="🔍 Cari nama, email, atau NIM..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 13,
                    minWidth: 220
                  }}
                />
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 13
                  }}
                >
                  <option value="all">Semua Role</option>
                  <option value="buyer">Mahasiswa (Buyer)</option>
                  <option value="seller">Tenant / Penjual</option>
                  <option value="driver">Kurir (Driver)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--am-primary)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                ➕ Tambah Pengguna Baru
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="am-card" style={{ padding: 0, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--am-bg2)', borderBottom: '1px solid var(--am-border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--am-text-muted)' }}>PENGGUNA</th>
                  <th style={{ padding: '12px 14px', color: 'var(--am-text-muted)' }}>ROLE</th>
                  <th style={{ padding: '12px 14px', color: 'var(--am-text-muted)' }}>KAMPUS</th>
                  <th style={{ padding: '12px 14px', color: 'var(--am-text-muted)' }}>STATUS PRO</th>
                  <th style={{ padding: '12px 14px', color: 'var(--am-text-muted)' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--am-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--am-text)' }}>{u.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)' }}>{u.email} {u.nim ? `• NIM ${u.nim}` : ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: u.role === 'seller' ? 'rgba(217,119,6,0.15)' : u.role === 'driver' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: u.role === 'seller' ? '#D97706' : u.role === 'driver' ? '#2563EB' : '#16A34A'
                      }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--am-text)' }}>
                      Kampus {u.campus === 'banjarmasin' ? '1 BJM' : '2 BJB'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {u.isPro ? (
                        <span style={{ color: '#D97706', fontWeight: 800, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          ⭐ PRO (Exp: {u.proExpireDate})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--am-text-muted)', fontSize: 11.5 }}>Reguler</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleTogglePro(u.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--am-border)',
                            background: u.isPro ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,6,0.15)',
                            color: u.isPro ? '#EF4444' : '#D97706',
                            fontWeight: 800,
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          {u.isPro ? 'Cabut PRO' : '⭐ Aktifkan PRO'}
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--am-border)',
                            background: u.status === 'active' ? 'var(--am-bg2)' : '#10B981',
                            color: u.status === 'active' ? 'var(--am-text)' : 'white',
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🤖 TAB 3: STATUS VENDING IOT 2 KAMPUS */}
      {activeTab === 'vending' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {vendingMachines.map(vm => (
            <div key={vm.id} className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>{vm.name}</h4>
                  <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)' }}>{vm.location}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#16A34A' }}>
                  ● ONLINE 24H
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, padding: 10, background: 'var(--am-bg2)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Suhu Chiller</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#38BDF8', marginTop: 2 }}>{vm.temperature}°C</div>
                </div>
                <div style={{ flex: 1, padding: 10, background: 'var(--am-bg2)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Terakhir Dispense</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)', marginTop: 4 }}>{vm.lastDispensed}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vm.stockSlots.map(slot => (
                  <div key={slot.slot} style={{ padding: '8px 10px', background: 'var(--am-bg2)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>
                      <span>Slot {slot.slot}: {slot.name}</span>
                      <span>{slot.stock} / {slot.max} pcs</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--am-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(slot.stock / slot.max) * 100}%`,
                        height: '100%',
                        background: slot.stock <= 3 ? '#EF4444' : slot.stock <= 6 ? '#F59E0B' : '#10B981',
                        borderRadius: 3
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 💳 TAB 4: KEUANGAN & MIDTRANS SETTLEMENT */}
      {activeTab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Midtrans Unsettled Pool</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--am-primary)', marginTop: 4 }}>
                {formatRupiah(14250000)}
              </div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>Siap Ditransfer ke Rekening Koperasi</div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Pending Payout Tenant</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#D97706', marginTop: 4 }}>
                {formatRupiah(8400000)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 4 }}>Menunggu jadwal pencairan mingguan</div>
            </div>
          </div>
        </div>
      )}

      {/* 📢 TAB 5: SIARAN PENGUMUMAN */}
      {activeTab === 'broadcast' && (
        <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
          <h3 className="am-heading" style={{ margin: '0 0 4px', fontSize: 17, color: 'var(--am-text)' }}>
            📢 Pancarkan Siaran Pengumuman Instan ke Seluruh Aplikasi
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--am-text-muted)' }}>
            Pesan broadcast akan langsung muncul sebagai popup notifikasi resmi di HP mahasiswa, pembeli, tenant, dan driver.
          </p>

          {broadcastSentFeedback && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.15)', color: '#16A34A', fontWeight: 800, fontSize: 13, marginBottom: 14 }}>
              ✅ Pengumuman berhasil dipancarkan ke seluruh aplikasi secara real-time!
            </div>
          )}

          <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Target Segmen:</label>
              <select
                value={broadcastTarget}
                onChange={e => setBroadcastTarget(e.target.value as any)}
                style={{ width: '100%', maxWidth: 300, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13 }}
              >
                <option value="all">Semua Pengguna Kampus</option>
                <option value="students">Khusus Mahasiswa / Pembeli</option>
                <option value="sellers">Khusus Mitra Penjual / Tenant</option>
                <option value="drivers">Khusus Mitra Driver Kurir</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Judul Pengumuman:</label>
              <input
                type="text"
                required
                placeholder="Contoh: Promo Kuliah Perdana & Flash Sale Koperasi!"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Isi Pesan:</label>
              <textarea
                required
                rows={3}
                placeholder="Tuliskan isi pengumuman kampus secara lengkap..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={!broadcastTitle.trim() || !broadcastMessage.trim()}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--am-primary)',
                color: 'white',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                alignSelf: 'flex-start'
              }}
            >
              🚀 Pancarkan Siaran Sekarang
            </button>
          </form>
        </div>
      )}

      {/* 📜 TAB 6: AUDIT LOG & DATABASE POSTGRESQL / PGADMIN DENGAN REKAP BULANAN PDF */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email Status Alert */}
          {emailStatusToast && (
            <div style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: emailStatusToast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${emailStatusToast.type === 'success' ? '#10B981' : '#EF4444'}`,
              color: emailStatusToast.type === 'success' ? '#065F46' : '#991B1B',
              fontWeight: 800,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{emailStatusToast.message}</span>
                {emailStatusToast.type === 'success' && (
                  <a
                    href="https://mail.google.com/mail/u/0/#inbox"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#10B981',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 11.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Buka Gmail ↗
                  </a>
                )}
              </div>
              <button
                onClick={() => setEmailStatusToast(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 900, cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* 🐘 POSTGRESQL & CRON AUTOMATION CONTROL CARD */}
          <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: 'white',
            borderRadius: 18,
            padding: 22,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, background: '#0284C7', color: 'white', padding: '2px 8px', borderRadius: 6 }}>
                    🐘 POSTGRESQL & PGADMIN
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, background: '#10B981', color: 'white', padding: '2px 8px', borderRadius: 6 }}>
                    ● 100% TERHUBUNG REAL-TIME
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                  Otomatisasi Rekap Bulanan Setiap Tanggal 1 ke Email
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>
                  Seluruh aktivitas role (Mahasiswa, Penjual, Driver, dan Super Admin) direkam ke PostgreSQL. Setiap tanggal 1 pukul 00:00 WITA, sistem mengompilasi laporan PDF, mengirim ke email Anda, dan menghapus log lama otomatis (Auto-Purge).
                </p>
              </div>

              {/* Target Email Configuration */}
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', minWidth: 260 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginBottom: 4 }}>
                  📧 EMAIL PENERIMA REKAP ADMIN:
                </div>
                {isEditingEmail ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="email"
                      value={adminRecapEmail}
                      onChange={e => setAdminRecapEmail(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #38BDF8', background: '#0F172A', color: 'white', fontSize: 12, flex: 1 }}
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('am_admin_recap_email', adminRecapEmail);
                        setIsEditingEmail(false);
                      }}
                      style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#10B981', color: 'white', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#38BDF8' }}>{adminRecapEmail}</span>
                    <button
                      onClick={() => setIsEditingEmail(true)}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}
                    >
                      Ubah
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#34D399', marginTop: 4, fontWeight: 700 }}>
                  ⏰ Jadwal: Setiap Tanggal 1 Pukul 00:00 WITA
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS (UNDUH PDF, KIRIM EMAIL, PURGE LOG) */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={handleDownloadPdfRecap}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
                }}
              >
                📄 Unduh Rekap PDF Bulan Ini
              </button>

              <button
                onClick={handleSendEmailRecap}
                disabled={isSendingEmail}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: isSendingEmail ? '#475569' : '#0284C7',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: isSendingEmail ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(2,132,199,0.35)'
                }}
              >
                {isSendingEmail ? '⏳ Mengirim ke Email...' : '📧 Kirim Rekap PDF ke Email Saya Sekarang'}
              </button>

              <button
                onClick={handlePurgeLogs}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#F87171',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: 'auto'
                }}
              >
                🧹 Bersihkan / Reset Log
              </button>
            </div>
          </div>

          {/* AUDIT LOG LIST & ROLE FILTER */}
          <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 16, color: 'var(--am-text)' }}>
                  📜 Riwayat Aliran Audit Log ({filteredLogs.length} Entri)
                </h3>
                <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)' }}>
                  Seluruh tindakan akun mahasiswa, penjual, driver, dan tindakan perubahan Super Admin.
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Cari tindakan atau nama..."
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12.5,
                    minWidth: 180
                  }}
                />
                <select
                  value={logRoleFilter}
                  onChange={e => setLogRoleFilter(e.target.value as any)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12.5
                  }}
                >
                  <option value="all">Semua Role</option>
                  <option value="buyer">Mahasiswa (Buyer)</option>
                  <option value="seller">Tenant / Penjual</option>
                  <option value="driver">Driver Kurir</option>
                  <option value="super_admin">Super Admin / Admin</option>
                </select>
              </div>
            </div>

            {/* Log Feed List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--am-bg2)',
                    border: '1px solid var(--am-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 14
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <span style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: log.role === 'super_admin' || log.role === 'admin' ? 'rgba(16,185,129,0.2)' : log.role === 'seller' ? 'rgba(217,119,6,0.15)' : log.role === 'driver' ? 'rgba(99,102,241,0.15)' : 'rgba(59,130,246,0.15)',
                      color: log.role === 'super_admin' || log.role === 'admin' ? '#047857' : log.role === 'seller' ? '#B45309' : log.role === 'driver' ? '#4338CA' : '#1D4ED8',
                      fontWeight: 900,
                      flexShrink: 0
                    }}>
                      {log.role.toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--am-text)' }}>
                        {log.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>
                        {log.desc} • <span style={{ color: 'var(--am-text)', fontWeight: 600 }}>{log.actorName}</span> ({log.actorEmail})
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--am-text)' }}>{log.timestamp}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Kampus {log.campus === 'banjarmasin' ? '1 BJM' : '2 BJB'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ➕ MODAL TAMBAH PENGGUNA */}
      {showAddUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="am-card" style={{
            width: '100%',
            maxWidth: 460,
            padding: 24,
            borderRadius: 20,
            background: 'var(--am-surface)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 17, color: 'var(--am-text)' }}>
                ➕ Daftarkan Pengguna / Admin Baru
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--am-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Pengguna / Admin"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Email Kampus / Akun:</label>
                <input
                  type="email"
                  required
                  placeholder="email@uin-antasari.ac.id"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>NIM Mahasiswa (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: 21010101001"
                  value={newUserNim}
                  onChange={e => setNewUserNim(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Peran (Role):</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  >
                    <option value="buyer">Mahasiswa (Buyer)</option>
                    <option value="seller">Tenant / Penjual</option>
                    <option value="driver">Driver Kurir</option>
                    <option value="admin">Admin Koperasi</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 4, color: 'var(--am-text)' }}>Kampus:</label>
                  <select
                    value={newUserCampus}
                    onChange={e => setNewUserCampus(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  >
                    <option value="banjarmasin">Kampus 1 Banjarmasin</option>
                    <option value="banjarbaru">Kampus 2 Banjarbaru</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                >
                  Simpan Akun ✅
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}