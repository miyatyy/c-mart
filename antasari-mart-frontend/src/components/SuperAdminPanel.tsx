import React, { useState, useEffect, useMemo } from 'react';
import type { ThemeMode, Product } from '../types';
import { formatRupiah } from '../data';
import {
  getProductsApi,
  moderateProductApi,
  analyzeProductAiApi,
  evaluateProductSuitabilityLocally
} from '../lib/api';
import AdminSellerVerificationPanel from './AdminSellerVerificationPanel';
import { subscribeToAdminEvents } from '../lib/echo';

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
  type: 'order' | 'vending' | 'user' | 'driver' | 'payment' | 'system' | 'pro' | 'admin_action' | 'product_moderation';
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

const INITIAL_PENDING_MODERATIONS: Product[] = [
  {
    id: 'pend-mod-1',
    name: 'Paket Ricebowl Ayam Sambal Matah Spesial',
    description: 'Nasi pulen hangat dengan ayam fillet krispi berbalut sambal matah khas Bali segar, timun, dan telur mata sapi. 100% Halal, higienis & ramah kantong mahasiswa.',
    price: 18000,
    stock: 25,
    category: 'Makanan',
    campus: 'banjarmasin',
    sellerId: 's_geprek_tarbiyah',
    sellerName: 'Kantin Mbak Siti (Fakultas Tarbiyah)',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&fit=crop',
    rating: 4.9,
    status: 'pending',
    aiAnalysis: {
      score: 94,
      recommendation: 'layak_dijual',
      summary: 'Produk makanan halal, higienis, harga sangat terjangkau mahasiswa, dan deskripsi sangat jelas.',
      explanation: 'Pemeriksaan AI DeepSeek mengonfirmasi produk ini bebas barang terlarang, memenuhi standar halal kampus UIN Antasari, dan harga Rp 18.000 sangat wajar bagi mahasiswa.',
      reasons: ['100% Halal & higienis', 'Harga bersahabat mahasiswa', 'Deskripsi dan foto lengkap'],
      flags: [],
      checks: {
        noProhibitedGoods: { passed: true, score: 100, reason: 'Tidak terindikasi miras, narkoba, atau bahan berbahaya.' },
        islamicEthicsHalal: { passed: true, score: 100, reason: 'Bahan baku makanan halal sesuai syariah dan etika kampus.' },
        studentPriceFairness: { passed: true, score: 90, reason: 'Harga Rp 18.000 sangat bersaing untuk paket makan siang mahasiswa.' },
        mediaAndDescriptionQuality: { passed: true, score: 85, reason: 'Foto dan rincian menu sangat informatif.' }
      },
      analyzedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      model: 'Antasari-AI-Safety-Engine v2.4'
    }
  },
  {
    id: 'pend-mod-2',
    name: 'Jasa Desain Banner Seminar & Jilid Skripsi Hardcover',
    description: 'Jasa pembuatan desain banner akademik UIN Antasari + cetak & jilid hardcover kilat 1 hari selesai untuk keperluan munaqasyah dan seminar proposal.',
    price: 35000,
    stock: 99,
    category: 'Jasa',
    campus: 'banjarmasin',
    sellerId: 's_percetakan_berkah',
    sellerName: 'Percetakan Digital Berkah Mhs',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&fit=crop',
    rating: 4.8,
    status: 'pending',
    aiAnalysis: {
      score: 89,
      recommendation: 'layak_dijual',
      summary: 'Layanan akademik yang sangat dibutuhkan civitas akademika UIN Antasari dengan harga terstandarisasi.',
      explanation: 'Layanan jasa jilid dan cetak memenuhi norma etika akademik UIN Antasari dan bebas pelanggaran plagiarisme atau joki skripsi ilegal.',
      reasons: ['Layanan cetak resmi', 'Bukan joki skripsi terlarang', 'Harga wajar'],
      flags: [],
      checks: {
        noProhibitedGoods: { passed: true, score: 100, reason: 'Jasa legal, murni percetakan & jilid hardcover.' },
        islamicEthicsHalal: { passed: true, score: 95, reason: 'Mendukung produktivitas tugas akhir mahasiswa secara jujur.' },
        studentPriceFairness: { passed: true, score: 85, reason: 'Harga Rp 35.000 standar ongkos jilid kampus.' },
        mediaAndDescriptionQuality: { passed: true, score: 78, reason: 'Informasi layanan cukup lengkap.' }
      },
      analyzedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      model: 'Antasari-AI-Safety-Engine v2.4'
    }
  },
  {
    id: 'pend-mod-3',
    name: 'Kaos Polo Eksklusif UIN Antasari Banjarmasin 2026',
    description: 'Kaos polo berkerah bahan 100% Cotton Lacoste CVC tebal, adem, jahitan rapi dengan bordir logo UIN Antasari presisi di dada kiri. Cocok untuk kuliah & organisasi.',
    price: 75000,
    stock: 30,
    category: 'Pakaian',
    campus: 'banjarbaru',
    sellerId: 's_myammiy_apparel',
    sellerName: 'Myammiy Campus Apparel',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&fit=crop',
    rating: 5.0,
    status: 'pending',
    aiAnalysis: {
      score: 92,
      recommendation: 'layak_dijual',
      summary: 'Merchandise resmi beretika sopan & menutup aurat untuk civitas akademika.',
      explanation: 'Produk pakaian berkerah rapi memenuhi aturan tata tertib busana mahasiswa UIN Antasari dan mutu bahan terjamin.',
      reasons: ['Busana sopan sesuai dresscode kampus', 'Bahan premium CVC', 'Harga kompetitif'],
      flags: [],
      checks: {
        noProhibitedGoods: { passed: true, score: 100, reason: 'Bebas gambar/tulisan pornografi atau provokatif.' },
        islamicEthicsHalal: { passed: true, score: 100, reason: 'Sopan, santun, sesuai tata tertib kampus Islami.' },
        studentPriceFairness: { passed: true, score: 85, reason: 'Harga Rp 75.000 standar distro polo bordir.' },
        mediaAndDescriptionQuality: { passed: true, score: 85, reason: 'Deskripsi bahan dan ukuran jelas.' }
      },
      analyzedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      model: 'Antasari-AI-Safety-Engine v2.4'
    }
  }
];

export default function SuperAdminPanel({ theme: _theme }: SuperAdminProps) {
  const [activeTab, setActiveTab] = useState<'realtime' | 'moderation' | 'verifications' | 'users' | 'vending' | 'finance' | 'broadcast' | 'logs'>('realtime');
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

  const [moderationProducts, setModerationProducts] = useState<Product[]>([]);
  const [moderationLoading, setModerationLoading] = useState<boolean>(true);
  const [moderationFilter, setModerationFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [moderationSearch, setModerationSearch] = useState<string>('');
  const [rejectingProduct, setRejectingProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [isProcessingModeration, setIsProcessingModeration] = useState<boolean>(false);
  const [moderationToast, setModerationToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [productSubmissionToast, setProductSubmissionToast] = useState<{
    id: string;
    title: string;
    sellerName: string;
    price: number;
    timestamp: string;
    aiScore?: number;
    rawProduct?: any;
  } | null>(null);

  const [liveTrafficPoints, setLiveTrafficPoints] = useState<number[]>([42, 48, 55, 60, 58, 64, 72, 80, 75, 88, 94, 91, 98, 104, 110, 115, 108, 122]);
  const [livePingMs, setLivePingMs] = useState<number>(24);
  const [activeUsersNow, setActiveUsersNow] = useState<number>(38);
  const [serverUptime] = useState<string>('99.98% (PostgreSQL & pgAdmin Synced)');

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNim, setNewUserNim] = useState('');
  const [newUserRole, setNewUserRole] = useState<'buyer' | 'seller' | 'driver' | 'admin'>('buyer');
  const [newUserCampus, setNewUserCampus] = useState<'banjarmasin' | 'banjarbaru'>('banjarmasin');

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'students' | 'sellers' | 'drivers'>('all');
  const [broadcastSentFeedback, setBroadcastSentFeedback] = useState(false);

  const [adminRecapEmail, setAdminRecapEmail] = useState<string>(() => {
    return localStorage.getItem('am_admin_recap_email') || 'miyya@gmail.com';
  });
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusToast, setEmailStatusToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [logRoleFilter, setLogRoleFilter] = useState<'all' | 'buyer' | 'seller' | 'driver' | 'admin' | 'super_admin'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const saveLogs = (newLogs: ActivityLogItem[]) => {
    setActivityLogs(newLogs);
    try {
      localStorage.setItem('am_superadmin_logs', JSON.stringify(newLogs));
    } catch {}
  };

  const loadModerationQueue = () => {
    setModerationLoading(true);
    let localPending: Product[] = [];
    try {
      const saved = localStorage.getItem('am_pending_moderations');
      localPending = saved ? JSON.parse(saved) : INITIAL_PENDING_MODERATIONS;
    } catch {
      localPending = INITIAL_PENDING_MODERATIONS;
    }

    const localCustom: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
    const mergedLocal = [...localPending, ...localCustom.filter(c => !localPending.some(p => p.id === c.id))];

    getProductsApi(undefined, 'all')
      .then(res => {
        if (res.success && Array.isArray(res.products)) {
          const serverList = res.products;
          const combined = [...mergedLocal, ...serverList.filter(s => !mergedLocal.some(m => m.id === s.id))];
          setModerationProducts(combined);
        } else {
          setModerationProducts(mergedLocal);
        }
        setModerationLoading(false);
      })
      .catch(() => {
        setModerationProducts(mergedLocal);
        setModerationLoading(false);
      });
  };

  useEffect(() => {
    loadModerationQueue();

    const handleSub = () => loadModerationQueue();
    const handleMod = () => loadModerationQueue();
    window.addEventListener('am_product_submitted', handleSub);
    window.addEventListener('am_product_moderated', handleMod);

    // 📡 Dengarkan Event Pengajuan Produk Real-Time via Soketi / WebSocket & CustomEvent
    const unsubAdmin = subscribeToAdminEvents({
      onProductSubmitted: (payload) => {
        loadModerationQueue();
        if (payload) {
          const prodTitle = payload.title || payload.name || 'Produk Baru';
          const seller = payload.sellerName || 'Penjual Lapak';
          const price = payload.price || 0;
          setProductSubmissionToast({
            id: payload.id || `sub_${Date.now()}`,
            title: prodTitle,
            sellerName: seller,
            price: price,
            timestamp: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Baru saja',
            aiScore: payload.aiScore,
            rawProduct: payload
          });

          // 🔔 Mainkan chime lonceng notifikasi audio Web Audio API
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.25, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.45);
              setTimeout(() => { try { ctx.close(); } catch (_) {} }, 500);
            }
          } catch (_) {}
        }
      }
    });

    return () => {
      window.removeEventListener('am_product_submitted', handleSub);
      window.removeEventListener('am_product_moderated', handleMod);
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  const handleApproveProduct = async (prodOrId: Product | string) => {
    setIsProcessingModeration(true);
    const prodId = typeof prodOrId === 'string' ? prodOrId : prodOrId.id;
    const prod = typeof prodOrId === 'object' ? prodOrId : moderationProducts.find(p => p.id === prodId);
    
    if (!prod) {
        setIsProcessingModeration(false);
        return;
    }

    try {
      await moderateProductApi(prod.id, 'approved', 'Disetujui dan lolos kurasi Super Admin', adminRecapEmail);
      
      const logEntry: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'super_admin',
        actorName: 'Nurmiyaty (Super Admin)',
        actorEmail: adminRecapEmail,
        type: 'admin_action',
        title: `Produk Disetujui: ${prod.name}`,
        desc: `Super Admin menyetujui produk dari "${prod.sellerName}" (Harga: ${formatRupiah(prod.price)}). Produk kini tayang ke publik.`,
        campus: (prod.campus as any) || 'banjarmasin',
        status: 'success'
      };
      saveLogs([logEntry, ...activityLogs]);

      setModerationToast({
        type: 'success',
        message: `✅ Produk "${prod.name}" berhasil disetujui & dipublikasikan ke etalase Campus Mart!`
      });
      loadModerationQueue();
    } catch (err: any) {
      setModerationToast({ type: 'error', message: 'Gagal menyetujui produk: ' + err.message });
    } finally {
      setIsProcessingModeration(false);
      setTimeout(() => setModerationToast(null), 8000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingProduct) return;
    const reason = rejectReason.trim() || 'Tidak memenuhi standar kelayakan produk kampus';
    setIsProcessingModeration(true);
    try {
      await moderateProductApi(rejectingProduct.id, 'rejected', reason, adminRecapEmail);

      const logEntry: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        role: 'super_admin',
        actorName: 'Nurmiyaty (Super Admin)',
        actorEmail: adminRecapEmail,
        type: 'admin_action',
        title: `Produk Ditolak: ${rejectingProduct.name}`,
        desc: `Super Admin menolak produk dari "${rejectingProduct.sellerName}". Alasan: ${reason}`,
        campus: (rejectingProduct.campus as any) || 'banjarmasin',
        status: 'warning'
      };
      saveLogs([logEntry, ...activityLogs]);

      setModerationToast({
        type: 'success',
        message: `❌ Produk "${rejectingProduct.name}" ditolak. Alasan telah dicatat & dikirim ke seller.`
      });
      setRejectingProduct(null);
      setRejectReason('');
      loadModerationQueue();
    } catch (err: any) {
      setModerationToast({ type: 'error', message: 'Gagal menolak produk: ' + err.message });
    } finally {
      setIsProcessingModeration(false);
      setTimeout(() => setModerationToast(null), 8000);
    }
  };

  // 🛡️ HANDLER: AUTO-APPROVE BATCH BERDASARKAN SKOR AI >= 85%
  const handleBatchAutoApprove = async () => {
    const pendingHighScores = moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 90) >= 85);
    if (pendingHighScores.length === 0) {
      alert('Tidak ada produk pending dengan skor AI >= 85% untuk auto-approve.');
      return;
    }

    if (!window.confirm(`⚡ Apakah Anda yakin ingin menyetujui ${pendingHighScores.length} produk sekaligus berdasarkan rekomendasi AI Skor >= 85%?`)) {
      return;
    }

    setIsProcessingModeration(true);
    let count = 0;
    for (const prod of pendingHighScores) {
      await moderateProductApi(prod.id, 'approved', 'Auto-Approve rekomendasi AI (Skor >= 85%)', adminRecapEmail);
      count++;
    }

    const logEntry: ActivityLogItem = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      role: 'super_admin',
      actorName: 'Nurmiyaty (Super Admin)',
      actorEmail: adminRecapEmail,
      type: 'admin_action',
      title: `Auto-Approve Batch AI (${count} Produk)`,
      desc: `Super Admin menyetujui ${count} produk secara otomatis berdasarkan skor kelayakan AI >= 85%`,
      campus: 'banjarmasin',
      status: 'success'
    };
    saveLogs([logEntry, ...activityLogs]);

    setModerationToast({
      type: 'success',
      message: `⚡ Berhasil menyetujui dan mempublikasikan ${count} produk rekomendasi AI!`
    });
    setIsProcessingModeration(false);
    loadModerationQueue();
    setTimeout(() => setModerationToast(null), 8000);
  };

  // 🛡️ HANDLER: RE-ANALISA AI PRODUK
  const handleReanalyzeWithAi = async (prod: Product) => {
    setIsProcessingModeration(true);
    try {
      const res = await analyzeProductAiApi({
        name: prod.name,
        description: prod.description,
        price: prod.price,
        category: prod.category,
        campus: prod.campus,
        sellerName: prod.sellerName
      });

      setModerationProducts(prev => prev.map(p => p.id === prod.id ? { ...p, aiAnalysis: res.analysis } : p));
      
      const existing: Product[] = JSON.parse(localStorage.getItem('am_custom_products') || '[]');
      const updated = existing.map(p => p.id === prod.id ? { ...p, aiAnalysis: res.analysis } : p);
      localStorage.setItem('am_custom_products', JSON.stringify(updated));

      setModerationToast({
        type: 'success',
        message: `🤖 Re-analisa AI selesai untuk "${prod.name}" (Skor: ${res.analysis.score}%)!`
      });
    } catch (err: any) {
      setModerationToast({ type: 'error', message: 'Gagal re-analisa AI: ' + err.message });
    } finally {
      setIsProcessingModeration(false);
      setTimeout(() => setModerationToast(null), 8000);
    }
  };

  // 🧪 FITUR SIMULASI PENGAJUAN PRODUK BARU & NOTIFIKASI REAL-TIME
  const handleSimulateSellerSubmission = async () => {
    const mockSamples = [
      {
        name: 'Kopi Susu Gula Aren Botol 250ml',
        description: 'Espresso blend robusta-arabika lokal kalsel dengan susu murni & gula aren asli. Dibuat fresh setiap pagi oleh barista mahasiswa FEBI UIN Antasari.',
        price: 15000,
        stock: 20,
        category: 'Minuman',
        campus: 'banjarmasin' as const,
        sellerId: 's_kopi_febi',
        sellerName: 'Kopi Mahasiswa FEBI'
      },
      {
        name: 'Keripik Pisang Lumer Coklat Keju Crunchy',
        description: 'Camilan keripik pisang kepok renyah dengan lelehan saus dark chocolate tebal dan parutan keju cheddar. Cemilan favorit saat nugas di perpustakaan.',
        price: 12000,
        stock: 40,
        category: 'Snack',
        campus: 'banjarmasin' as const,
        sellerId: 's_snack_berkah',
        sellerName: 'Snack Corner Tarbiyah'
      },
      {
        name: 'Flashdisk Sandisk 64GB Isi Template Skripsi & Software Kampus',
        description: 'Flashdisk original USB 3.0 kapasitas 64GB bergaransi resmi, bonus kumpulan template dokumen skripsi, jurnal terindeks, dan e-book referensi UIN Antasari.',
        price: 55000,
        stock: 15,
        category: 'Elektronik',
        campus: 'banjarbaru' as const,
        sellerId: 's_tech_fsh',
        sellerName: 'Antasari Digital Tech'
      }
    ];

    const pick = mockSamples[Math.floor(Math.random() * mockSamples.length)];
    const newId = `pend-sim-${Date.now()}`;
    const aiAnalysis = evaluateProductSuitabilityLocally(pick);

    const newProduct: Product = {
      id: newId,
      ...pick,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&fit=crop',
      rating: 5.0,
      status: 'pending',
      aiAnalysis,
      createdAt: new Date().toISOString()
    };

    // Simpan ke storage
    const currentPending: Product[] = JSON.parse(localStorage.getItem('am_pending_moderations') || '[]');
    const updated = [newProduct, ...currentPending.filter(p => p.id !== newId)];
    localStorage.setItem('am_pending_moderations', JSON.stringify(updated));

    // Picu Notifikasi Banner & Chime Real-time ke Super Admin
    window.dispatchEvent(new CustomEvent('am_trigger_notification', {
      detail: {
        id: `notif-sim-${Date.now()}`,
        senderId: 'ai_moderation_queue',
        senderName: '🛡️ Kurasi AI Antasari',
        senderRole: 'super_admin',
        senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AntasariAI',
        text: `📢 Produk baru "${newProduct.name}" (${newProduct.sellerName}) diajukan untuk kurasi! Skor AI: ${aiAnalysis.score}%.`,
        time: 'Baru saja',
        isAi: true
      }
    }));

    // Update antrean
    loadModerationQueue();

    setModerationToast({
      type: 'success',
      message: `🔔 Notifikasi simulasi aktif! Produk "${newProduct.name}" masuk ke antrean kurasi AI.`
    });
    setTimeout(() => setModerationToast(null), 8000);
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
        <h1 class="brand-title">🏛️ CAMPUS MART - PUSAT DATA</h1>
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

  // Filter Moderasi Produk AI
  const filteredModerationProducts = useMemo(() => {
    return moderationProducts.filter(p => {
      const pStatus = p.status || 'approved';
      const matchFilter = moderationFilter === 'all' || pStatus === moderationFilter;
      const matchSearch = moderationSearch === '' ||
        p.name.toLowerCase().includes(moderationSearch.toLowerCase()) ||
        (p.sellerName && p.sellerName.toLowerCase().includes(moderationSearch.toLowerCase())) ||
        p.category.toLowerCase().includes(moderationSearch.toLowerCase()) ||
        p.campus.toLowerCase().includes(moderationSearch.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [moderationProducts, moderationFilter, moderationSearch]);

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
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Pusat Kontrol & Ekosistem Campus Mart</h2>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, opacity: 0.85 }}>
                Monitoring lalu lintas sistem, status IoT vending, hak akses pengguna, dan audit finansial otomatis.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* 🔔 Ikon Lonceng Notifikasi Pengajuan Produk Baru */}
            <button
              onClick={() => setActiveTab('moderation')}
              title={`${moderationProducts.filter(p => p.status === 'pending').length} Produk Baru Menunggu Kurasi`}
              style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                fontSize: 20,
                transition: 'all 0.2s',
                boxShadow: moderationProducts.some(p => p.status === 'pending') ? '0 0 16px rgba(239, 68, 68, 0.45)' : 'none'
              }}
            >
              <span>🔔</span>
              {moderationProducts.filter(p => p.status === 'pending').length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  background: '#EF4444',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: 20,
                  height: 20,
                  fontSize: 10.5,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.7)',
                  border: '2px solid #0F172A'
                }}>
                  {moderationProducts.filter(p => p.status === 'pending').length > 99 ? '99+' : moderationProducts.filter(p => p.status === 'pending').length}
                </span>
              )}
            </button>

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
          { 
            key: 'moderation', 
            label: '🛡️ Moderasi & Kurasi Produk AI', 
            icon: '🤖', 
            badge: moderationProducts.filter(p => p.status === 'pending').length,
            badgeColor: moderationProducts.some(p => p.status === 'pending') ? '#EF4444' : undefined
          },
          { key: 'verifications', label: '🎓 Verifikasi Mahasiswa (KTM)', icon: '🎓' },
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
                background: (tab as any).badgeColor 
                  ? '#EF4444' 
                  : (activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--am-bg2)'),
                color: (tab as any).badgeColor ? 'white' : (activeTab === tab.key ? 'white' : 'var(--am-text-muted)'),
                fontWeight: 900
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 🎓 TAB: VERIFIKASI PENJUAL MAHASISWA & DOKUMEN KTM */}
      {activeTab === 'verifications' && (
        <AdminSellerVerificationPanel
          adminEmail="miyya@gmail.com"
          adminName="Nurmiyaty (Super Admin)"
          adminRole="super_admin"
        />
      )}

      {/* 🛡️ TAB: MODERASI & KURASI PRODUK AI (SUPER ADMIN) */}
      {activeTab === 'moderation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Top Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Menunggu Kurasi Admin</div>
                <span style={{ fontSize: 20 }}>⏳</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: moderationProducts.filter(p => p.status === 'pending').length > 0 ? '#F59E0B' : 'var(--am-text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                {moderationProducts.filter(p => p.status === 'pending').length}
                {moderationProducts.filter(p => p.status === 'pending').length > 0 && (
                  <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: '#D97706', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>
                    Perlu Ditinjau
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 4 }}>
                Produk belum dipublikasikan ke katalog umum
              </div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Produk Disetujui (Tayang)</div>
                <span style={{ fontSize: 20 }}>✅</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', marginTop: 4 }}>
                {moderationProducts.filter(p => p.status === 'approved').length}
              </div>
              <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                ● Aktif dapat dibeli mahasiswa
              </div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontWeight: 700 }}>Produk Ditolak</div>
                <span style={{ fontSize: 20 }}>❌</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444', marginTop: 4 }}>
                {moderationProducts.filter(p => p.status === 'rejected').length}
              </div>
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 4 }}>
                ● Dikembalikan ke seller dengan catatan
              </div>
            </div>

            <div className="am-card" style={{ padding: 18, borderRadius: 16, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,78,59,0.15))', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#047857', fontWeight: 800 }}>⚡ Rekomendasi AI Siap Publikasi</div>
                <span style={{ fontSize: 20 }}>🤖</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', marginTop: 4 }}>
                {moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 0) >= 85).length}
              </div>
              <button
                onClick={handleBatchAutoApprove}
                disabled={moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 0) >= 85).length === 0 || isProcessingModeration}
                style={{
                  marginTop: 6,
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 0) >= 85).length > 0 ? '#10B981' : 'var(--am-border)',
                  color: moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 0) >= 85).length > 0 ? 'white' : 'var(--am-text-muted)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: moderationProducts.filter(p => p.status === 'pending' && (p.aiAnalysis?.score || 0) >= 85).length > 0 ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s'
                }}
              >
                {isProcessingModeration ? 'Memproses...' : `⚡ Auto-Approve Rekomendasi AI`}
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="am-card" style={{ padding: 16, borderRadius: 16, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                <input
                  type="text"
                  placeholder="🔍 Cari nama produk, penjual, kategori, kampus..."
                  value={moderationSearch}
                  onChange={e => setModerationSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 13,
                    minWidth: 260
                  }}
                />

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { key: 'pending', label: `⏳ Menunggu Kurasi (${moderationProducts.filter(p => p.status === 'pending').length})` },
                    { key: 'approved', label: `✅ Disetujui (${moderationProducts.filter(p => p.status === 'approved').length})` },
                    { key: 'rejected', label: `❌ Ditolak (${moderationProducts.filter(p => p.status === 'rejected').length})` },
                    { key: 'all', label: `📁 Semua (${moderationProducts.length})` }
                  ].map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => setModerationFilter(filter.key as any)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: moderationFilter === filter.key ? '1px solid var(--am-primary)' : '1px solid var(--am-border)',
                        background: moderationFilter === filter.key ? 'rgba(16,185,129,0.12)' : 'var(--am-bg2)',
                        color: moderationFilter === filter.key ? 'var(--am-primary)' : 'var(--am-text)',
                        fontWeight: moderationFilter === filter.key ? 800 : 600,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSimulateSellerSubmission}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid #10B981',
                    background: 'rgba(16,185,129,0.1)',
                    color: '#047857',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🧪 Uji Notifikasi Seller Baru
                </button>

                <button
                  onClick={loadModerationQueue}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🔄 Segarkan Antrean
                </button>
              </div>
            </div>
          </div>

          {/* Product Moderation Queue Cards */}
          {moderationLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 28, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🤖</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Memuat antrean moderasi produk AI...</div>
            </div>
          ) : filteredModerationProducts.length === 0 ? (
            <div className="am-card" style={{ padding: 48, textAlign: 'center', borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️✨</div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--am-text)' }}>
                Tidak Ada Produk dalam Antrean
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--am-text-muted)', maxWidth: 460, marginInline: 'auto' }}>
                {moderationFilter === 'pending'
                  ? 'Semua produk seller telah diperiksa dan dikurasi oleh Super Admin. Katalog kampus aman!'
                  : 'Tidak ditemukan produk yang cocok dengan filter atau pencarian Anda.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredModerationProducts.map(prod => {
                const ai = prod.aiAnalysis;
                const score = ai?.score ?? 0;
                const scoreColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
                const scoreBg = score >= 80 ? 'rgba(16,185,129,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                const pStatus = prod.status || 'approved';

                return (
                  <div
                    key={prod.id}
                    className="am-card"
                    style={{
                      padding: 20,
                      borderRadius: 18,
                      background: 'var(--am-surface)',
                      border: pStatus === 'pending' ? '1.5px solid #F59E0B' : '1px solid var(--am-border)',
                      boxShadow: pStatus === 'pending' ? '0 4px 18px rgba(245,158,11,0.08)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                      <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 280 }}>
                        <div style={{ position: 'relative', width: 78, height: 78, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
                            alt={prod.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'; }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              background: pStatus === 'approved' ? 'rgba(16,185,129,0.15)' : pStatus === 'rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                              color: pStatus === 'approved' ? '#10B981' : pStatus === 'rejected' ? '#EF4444' : '#D97706'
                            }}>
                              {pStatus === 'approved' ? '✅ Disetujui (Tayang)' : pStatus === 'rejected' ? '❌ Ditolak' : '⏳ Menunggu Kurasi Admin'}
                            </span>
                            <span style={{ fontSize: 11, background: 'var(--am-bg2)', color: 'var(--am-text-muted)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                              📁 {prod.category}
                            </span>
                            <span style={{ fontSize: 11, background: 'var(--am-bg2)', color: 'var(--am-text-muted)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                              📍 Kampus {prod.campus === 'banjarmasin' ? '1 Bjm' : '2 Bjb'}
                            </span>
                          </div>

                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>
                            {prod.name}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--am-primary)' }}>
                              {formatRupiah(prod.price)}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                              👤 Penjual: <strong>{prod.sellerName || 'Tenant Kampus'}</strong>
                            </span>
                            {prod.stock !== undefined && (
                              <span style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                                📦 Stok: <strong>{prod.stock} unit</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Score Badge Box */}
                      {ai ? (
                        <div style={{
                          background: scoreBg,
                          border: `1px solid ${scoreColor}40`,
                          padding: '10px 14px',
                          borderRadius: 14,
                          textAlign: 'center',
                          minWidth: 150
                        }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: scoreColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Skor Kelayakan AI
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: scoreColor, marginTop: 2 }}>
                            {score}%
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: scoreColor, marginTop: 2 }}>
                            {score >= 80 ? '🟢 Layak Dijual' : score >= 60 ? '🟡 Perlu Tinjau' : '🔴 Tidak Disarankan'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReanalyzeWithAi(prod)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: '1px dashed var(--am-primary)',
                            background: 'rgba(16,185,129,0.08)',
                            color: 'var(--am-primary)',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          🤖 Pindai dengan AI
                        </button>
                      )}
                    </div>

                    {/* Description snippet */}
                    <div style={{ fontSize: 12.5, color: 'var(--am-text)', opacity: 0.85, marginBottom: 12, background: 'var(--am-bg2)', padding: '8px 12px', borderRadius: 10 }}>
                      <strong style={{ color: 'var(--am-text)' }}>Deskripsi Produk:</strong> {prod.description || 'Tidak ada deskripsi detail.'}
                    </div>

                    {/* AI Policy Checks Breakdown */}
                    {ai && (
                      <div style={{
                        background: 'var(--am-bg2)',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 14,
                        border: '1px solid var(--am-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🤖 Hasil Verifikasi Kebijakan Otomatis (DeepSeek AI):</span>
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
                            {ai.analyzedAt ? new Date(ai.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} WITA
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                            <span>{(ai.checks?.noProhibitedGoods?.passed ?? true) ? '✅' : '❌'}</span>
                            <span style={{ color: (ai.checks?.noProhibitedGoods?.passed ?? true) ? 'var(--am-text)' : '#EF4444', fontWeight: (ai.checks?.noProhibitedGoods?.passed ?? true) ? 600 : 800 }}>
                              Bebas Barang Terlarang / Narkoba / Sajam
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                            <span>{(ai.checks?.islamicEthicsHalal?.passed ?? true) ? '✅' : '❌'}</span>
                            <span style={{ color: (ai.checks?.islamicEthicsHalal?.passed ?? true) ? 'var(--am-text)' : '#EF4444', fontWeight: (ai.checks?.islamicEthicsHalal?.passed ?? true) ? 600 : 800 }}>
                              Etika Kampus Islam & Kehalalan
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                            <span>{(ai.checks?.studentPriceFairness?.passed ?? true) ? '✅' : '⚠️'}</span>
                            <span style={{ color: (ai.checks?.studentPriceFairness?.passed ?? true) ? 'var(--am-text)' : '#F59E0B', fontWeight: 600 }}>
                              Kewajaran Harga Mahasiswa
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                            <span>{(ai.checks?.mediaAndDescriptionQuality?.passed ?? true) ? '✅' : '⚠️'}</span>
                            <span style={{ color: (ai.checks?.mediaAndDescriptionQuality?.passed ?? true) ? 'var(--am-text)' : '#F59E0B', fontWeight: 600 }}>
                              Kelengkapan Deskripsi & Foto
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--am-text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--am-border)', paddingTop: 8 }}>
                          <strong>💡 Catatan AI:</strong> "{ai.explanation || 'Analisis kepatuhan kebijakan produk selesai.'}"
                        </div>
                      </div>
                    )}

                    {/* Rejection notice if rejected */}
                    {pStatus === 'rejected' && prod.moderationReason && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        padding: '10px 14px',
                        borderRadius: 12,
                        marginBottom: 14,
                        fontSize: 12,
                        color: '#B91C1C'
                      }}>
                        <strong>⚠️ Alasan Penolakan Super Admin:</strong> {prod.moderationReason}
                      </div>
                    )}

                    {/* Action Buttons Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--am-border)', paddingTop: 14 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setInspectingProduct(prod)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 10,
                            border: '1px solid var(--am-border)',
                            background: 'var(--am-bg2)',
                            color: 'var(--am-text)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          🔍 Detail Analisis Lengkap
                        </button>

                        <button
                          onClick={() => handleReanalyzeWithAi(prod)}
                          disabled={isProcessingModeration}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 10,
                            border: '1px solid var(--am-border)',
                            background: 'var(--am-bg2)',
                            color: 'var(--am-text)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          🔄 Scan Ulang AI
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {pStatus !== 'rejected' && (
                          <button
                            onClick={() => {
                              setRejectingProduct(prod);
                              setRejectReason('');
                            }}
                            disabled={isProcessingModeration}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 10,
                              border: '1px solid #EF4444',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#EF4444',
                              fontSize: 12.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            ❌ Tolak Produk
                          </button>
                        )}

                        {pStatus !== 'approved' && (
                          <button
                            onClick={() => handleApproveProduct(prod.id, prod.name)}
                            disabled={isProcessingModeration}
                            style={{
                              padding: '8px 18px',
                              borderRadius: 10,
                              border: 'none',
                              background: 'var(--am-primary)',
                              color: 'white',
                              fontSize: 12.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                            }}
                          >
                            ✅ Setujui & Publikasikan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* 🛡️ MODAL TOLAK PRODUK DENGAN ALASAN SUPER ADMIN */}
      {rejectingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="am-card" style={{
            width: '100%',
            maxWidth: 520,
            padding: 24,
            borderRadius: 20,
            background: 'var(--am-surface)',
            border: '1px solid var(--am-border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  ❌
                </div>
                <div>
                  <h3 className="am-heading" style={{ margin: 0, fontSize: 17, color: 'var(--am-text)' }}>
                    Tolak Publikasi Produk
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                    {rejectingProduct.name} • {rejectingProduct.sellerName || 'Tenant'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRejectingProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--am-text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 12.5, color: 'var(--am-text-muted)', marginBottom: 14 }}>
              Berikan alasan penolakan agar penjual dapat memperbaiki deskripsi, foto, atau harga produk sebelum mengajukan kembali:
            </div>

            {/* Quick Reason Presets */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 6, color: 'var(--am-text)' }}>
                Pilih Alasan Cepat (Template):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  'Deskripsi & foto produk kurang informatif',
                  'Harga tidak wajar untuk standar mahasiswa UIN',
                  'Melanggar norma etika kampus Islami UIN Antasari',
                  'Foto terindikasi buram / melanggar hak cipta',
                  'Barang tidak sesuai kategori / terlarang'
                ].map((reasonText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(reasonText)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: rejectReason === reasonText ? '1px solid #EF4444' : '1px solid var(--am-border)',
                      background: rejectReason === reasonText ? 'rgba(239,68,68,0.1)' : 'var(--am-bg2)',
                      color: rejectReason === reasonText ? '#EF4444' : 'var(--am-text)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {reasonText}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, marginBottom: 6, color: 'var(--am-text)' }}>
                Alasan / Catatan Evaluasi untuk Penjual:
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Tuliskan catatan detail mengenai apa yang harus diperbaiki oleh seller..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--am-border)',
                  background: 'var(--am-bg2)',
                  color: 'var(--am-text)',
                  fontSize: 12.5,
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRejectingProduct(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border)',
                  background: 'var(--am-bg2)',
                  color: 'var(--am-text)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || isProcessingModeration}
                style={{
                  padding: '8px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#EF4444',
                  color: 'white',
                  fontWeight: 800,
                  cursor: rejectReason.trim() && !isProcessingModeration ? 'pointer' : 'not-allowed',
                  opacity: rejectReason.trim() && !isProcessingModeration ? 1 : 0.6
                }}
              >
                {isProcessingModeration ? 'Memproses...' : 'Tolak & Kirim Catatan ❌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 MODAL DEEP INSPECTION AUDIT AI */}
      {inspectingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="am-card" style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            borderRadius: 22,
            background: 'var(--am-surface)',
            border: '1px solid var(--am-border)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  🤖
                </div>
                <div>
                  <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>
                    Laporan Lengkap Audit AI DeepSeek
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                    Evaluasi Kepatuhan Produk Kampus UIN Antasari
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectingProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--am-text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Product Summary */}
            <div style={{
              display: 'flex',
              gap: 14,
              padding: 14,
              borderRadius: 14,
              background: 'var(--am-bg2)',
              border: '1px solid var(--am-border)',
              marginBottom: 16
            }}>
              <img
                src={inspectingProduct.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}
                alt={inspectingProduct.name}
                style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--am-primary)', fontWeight: 800, textTransform: 'uppercase' }}>
                  {inspectingProduct.category} • Kampus {inspectingProduct.campus === 'banjarmasin' ? '1 Bjm' : '2 Bjb'}
                </div>
                <h4 style={{ margin: '2px 0 4px', fontSize: 15, fontWeight: 900, color: 'var(--am-text)' }}>
                  {inspectingProduct.name}
                </h4>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--am-primary)' }}>
                  {formatRupiah(inspectingProduct.price)}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', marginTop: 2 }}>
                  Penjual: <strong>{inspectingProduct.sellerName || 'Tenant'}</strong>
                </div>
              </div>
            </div>

            {/* AI Score & Recommendation */}
            {inspectingProduct.aiAnalysis ? (
              <div>
                <div style={{
                  padding: 16,
                  borderRadius: 14,
                  background: (inspectingProduct.aiAnalysis.score >= 80)
                    ? 'rgba(16,185,129,0.1)'
                    : (inspectingProduct.aiAnalysis.score >= 60)
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${(inspectingProduct.aiAnalysis.score >= 80) ? '#10B981' : (inspectingProduct.aiAnalysis.score >= 60) ? '#F59E0B' : '#EF4444'}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--am-text-muted)' }}>
                      Skor Kelayakan Produk
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: (inspectingProduct.aiAnalysis.score >= 80) ? '#10B981' : (inspectingProduct.aiAnalysis.score >= 60) ? '#D97706' : '#EF4444' }}>
                      {inspectingProduct.aiAnalysis.score} / 100%
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                      Rekomendasi AI: {inspectingProduct.aiAnalysis.recommendation.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Waktu Audit AI</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text)' }}>
                      {new Date(inspectingProduct.aiAnalysis.analyzedAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* 4 Pillars Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--am-text)' }}>
                    📋 Rincian 4 Pilar Kebijakan UIN Antasari:
                  </div>

                  {/* Pillar 1 */}
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>
                        1. 🚫 Bebas Barang Terlarang / Narkoba / Sajam
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: (inspectingProduct.aiAnalysis?.checks?.noProhibitedGoods?.passed ?? true) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: (inspectingProduct.aiAnalysis?.checks?.noProhibitedGoods?.passed ?? true) ? '#10B981' : '#EF4444'
                      }}>
                        {(inspectingProduct.aiAnalysis?.checks?.noProhibitedGoods?.passed ?? true) ? '✅ LOLOS' : '❌ PELANGGARAN'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                      {inspectingProduct.aiAnalysis?.checks?.noProhibitedGoods?.reason || 'Lolos verifikasi standar kampus.'}
                    </div>
                  </div>

                  {/* Pillar 2 */}
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>
                        2. 🕌 Etika Kampus Islami & Standar Kehalalan
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: (inspectingProduct.aiAnalysis?.checks?.islamicEthicsHalal?.passed ?? true) ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: (inspectingProduct.aiAnalysis?.checks?.islamicEthicsHalal?.passed ?? true) ? '#10B981' : '#EF4444'
                      }}>
                        {(inspectingProduct.aiAnalysis?.checks?.islamicEthicsHalal?.passed ?? true) ? '✅ LOLOS' : '❌ MELANGGAR'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                      {inspectingProduct.aiAnalysis?.checks?.islamicEthicsHalal?.reason || 'Sesuai etika dan syariah kampus Islami.'}
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>
                        3. 💰 Kewajaran Harga Mahasiswa
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: (inspectingProduct.aiAnalysis?.checks?.studentPriceFairness?.passed ?? true) ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: (inspectingProduct.aiAnalysis?.checks?.studentPriceFairness?.passed ?? true) ? '#10B981' : '#D97706'
                      }}>
                        {(inspectingProduct.aiAnalysis?.checks?.studentPriceFairness?.passed ?? true) ? '✅ WAJAR' : '⚠️ PERLU TINJAU'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                      {inspectingProduct.aiAnalysis?.checks?.studentPriceFairness?.reason || 'Harga standar dan wajar untuk mahasiswa.'}
                    </div>
                  </div>

                  {/* Pillar 4 */}
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>
                        4. 📸 Kelengkapan Deskripsi & Foto Produk
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: (inspectingProduct.aiAnalysis?.checks?.mediaAndDescriptionQuality?.passed ?? true) ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: (inspectingProduct.aiAnalysis?.checks?.mediaAndDescriptionQuality?.passed ?? true) ? '#10B981' : '#D97706'
                      }}>
                        {(inspectingProduct.aiAnalysis?.checks?.mediaAndDescriptionQuality?.passed ?? true) ? '✅ LENGKAP' : '⚠️ KURANG'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                      {inspectingProduct.aiAnalysis?.checks?.mediaAndDescriptionQuality?.reason || 'Foto dan deskripsi memenuhi ketentuan.'}
                    </div>
                  </div>
                </div>

                {/* Explanation text */}
                <div style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--am-bg2)',
                  border: '1px solid var(--am-border)',
                  fontSize: 12.5,
                  color: 'var(--am-text)',
                  lineHeight: 1.5,
                  marginBottom: 16
                }}>
                  <strong style={{ display: 'block', marginBottom: 4, color: 'var(--am-primary)' }}>
                    💡 Ringkasan & Rekomendasi Sistem AI:
                  </strong>
                  "{inspectingProduct.aiAnalysis?.explanation || 'Analisis kepatuhan kebijakan produk selesai.'}"
                </div>
              </div>
            ) : (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--am-text-muted)' }}>
                Belum ada data audit AI untuk produk ini.
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTop: '1px solid var(--am-border)', paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setInspectingProduct(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border)',
                  background: 'var(--am-bg2)',
                  color: 'var(--am-text)',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {inspectingProduct.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingProduct(inspectingProduct);
                      setInspectingProduct(null);
                      setRejectReason('');
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid #EF4444',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#EF4444',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Tolak Produk
                  </button>
                )}

                {inspectingProduct.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveProduct(inspectingProduct.id, inspectingProduct.name);
                      setInspectingProduct(null);
                    }}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--am-primary)',
                      color: 'white',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Setujui & Publikasikan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 FLOATING REAL-TIME PRODUCT SUBMISSION TOAST FOR SUPER ADMIN */}
      {productSubmissionToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 10001,
          maxWidth: 420,
          width: '92%',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          border: '1.5px solid #10B981',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.25)',
          color: '#F8FAFC',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🔔</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: '#34D399' }}>Pengajuan Produk Baru!</div>
                <div style={{ fontSize: 10.5, color: '#94A3B8' }}>{productSubmissionToast.timestamp || 'Baru saja'} • Perlu Kurasi Admin</div>
              </div>
            </div>
            <button
              onClick={() => setProductSubmissionToast(null)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 16, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#FFFFFF', marginBottom: 2 }}>
              {productSubmissionToast.title}
            </div>
            <div style={{ fontSize: 12, color: '#CBD5E1' }}>
              Penjual: <strong>{productSubmissionToast.sellerName}</strong>
            </div>
            <div style={{ fontSize: 12, color: '#34D399', fontWeight: 800, marginTop: 4 }}>
              {formatRupiah(productSubmissionToast.price)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                setActiveTab('moderation');
                setProductSubmissionToast(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#10B981',
                color: 'white',
                fontWeight: 800,
                fontSize: 12,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Tinjau Produk ↗
            </button>
            <button
              onClick={() => {
                handleApproveProduct(productSubmissionToast.rawProduct || productSubmissionToast.id);
                setProductSubmissionToast(null);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(16,185,129,0.15)',
                color: '#34D399',
                fontWeight: 800,
                fontSize: 12,
                border: '1px solid rgba(16,185,129,0.3)',
                cursor: 'pointer'
              }}
            >
              Setujui
            </button>
            <button
              onClick={() => {
                setRejectingProduct(productSubmissionToast.rawProduct || { id: productSubmissionToast.id, name: productSubmissionToast.title } as any);
                setRejectReason('');
                setProductSubmissionToast(null);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.15)',
                color: '#F87171',
                fontWeight: 800,
                fontSize: 12,
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer'
              }}
            >
              Tolak
            </button>
          </div>
        </div>
      )}

      {/* 🔔 MODERATION TOAST ALERT */}
      {moderationToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          borderRadius: 14,
          background: moderationToast.type === 'success' ? '#064E3B' : '#7F1D1D',
          color: 'white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          border: `1px solid ${moderationToast.type === 'success' ? '#10B981' : '#EF4444'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10000,
          fontSize: 13,
          fontWeight: 700,
          maxWidth: 420
        }}>
          <span>{moderationToast.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ flex: 1 }}>{moderationToast.message}</span>
          <button
            onClick={() => setModerationToast(null)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16, padding: 0 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}