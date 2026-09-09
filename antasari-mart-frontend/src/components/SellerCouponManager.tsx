import { useState, useEffect } from 'react';
import type { SellerCoupon, CouponDiscountType, ThemeMode, Product } from '../types';
import { formatRupiah } from '../data';
import {
  getVouchersApi,
  createVoucherApi,
  updateVoucherApi,
  deleteVoucherApi,
  toggleVoucherApi
} from '../lib/api';

interface SellerCouponManagerProps {
  sellerId: string;
  sellerName: string;
  theme?: ThemeMode;
  products?: Product[];
  onNotify?: (msg: string, type: 'success' | 'error') => void;
}

const BADGE_OPTIONS = [
  '🎟️ Promo Toko',
  '🔥 Diskon Kilat',
  '🎀 Myammiy Lucu',
  '🛵 Free Ongkir',
  '✨ Spesial Mahasiswa',
  '🍔 Kuliner Lezat',
  '📦 Borong Hemat',
  '🎉 Gajian Kampus'
];

export default function SellerCouponManager({
  sellerId,
  sellerName,
  theme: _theme,
  products = [],
  onNotify
}: SellerCouponManagerProps) {
  const [coupons, setCoupons] = useState<SellerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'running' | 'scheduled' | 'ended'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<SellerCoupon | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<CouponDiscountType>('percentage');
  const [formValue, setFormValue] = useState<string>('15');
  const [formMinSpend, setFormMinSpend] = useState<string>('20000');
  const [formMaxDiscount, setFormMaxDiscount] = useState<string>('10000');
  const [formQuota, setFormQuota] = useState<string>('50');
  const [formStartDate, setFormStartDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [formEndDate, setFormEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  });
  const [formBadge, setFormBadge] = useState('🔥 Diskon Kilat');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Coupons
  const loadCoupons = async () => {
    setLoading(true);
    const res = await getVouchersApi(sellerId);
    if (res && res.success && res.vouchers) {
      setCoupons(res.vouchers);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCoupons();
  }, [sellerId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    const randSuffix = Math.floor(Math.random() * 900 + 100);
    const prefix = (sellerName || 'PROMO').replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase();
    setFormCode(`${prefix}${randSuffix}`);
    setFormName('Promo Diskon Spesial Toko');
    setFormDiscountType('percentage');
    setFormValue('15');
    setFormMinSpend('20000');
    setFormMaxDiscount('10000');
    setFormQuota('50');
    setFormStartDate(new Date().toISOString().slice(0, 16));
    const end = new Date();
    end.setDate(end.getDate() + 7);
    setFormEndDate(end.toISOString().slice(0, 16));
    setFormBadge('🔥 Diskon Kilat');
    setFormDescription('Gunakan kupon ini saat checkout untuk mendapatkan potongan harga!');
    setFormIsActive(true);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: SellerCoupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormName(c.name);
    setFormDiscountType(c.discountType);
    setFormValue(String(c.value));
    setFormMinSpend(String(c.minSpend || 0));
    setFormMaxDiscount(String(c.maxDiscount || 0));
    setFormQuota(String(c.quota || 100));
    setFormStartDate(c.startDate ? c.startDate.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setFormEndDate(c.endDate ? c.endDate.slice(0, 16) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
    setFormBadge(c.badge || '🎟️ Promo');
    setFormDescription(c.description || '');
    setFormIsActive(c.isActive);
    setShowModal(true);
  };

  // Quick Duration Preset
  const handleApplyDurationPreset = (hours: number) => {
    const start = new Date(formStartDate || new Date());
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setFormEndDate(end.toISOString().slice(0, 16));
    if (onNotify) onNotify(`Jangka waktu promo diatur: ${hours >= 24 ? `${Math.round(hours / 24)} Hari` : `${hours} Jam`} ⏳`, 'success');
  };

  // Quick Templates
  const handleApplyTemplate = (tmpl: {
    name: string;
    codePrefix: string;
    type: CouponDiscountType;
    value: number;
    minSpend: number;
    maxDiscount: number;
    badge: string;
    durationDays: number;
    desc: string;
  }) => {
    const rand = Math.floor(Math.random() * 900 + 100);
    setFormCode(`${tmpl.codePrefix}${rand}`);
    setFormName(tmpl.name);
    setFormDiscountType(tmpl.type);
    setFormValue(String(tmpl.value));
    setFormMinSpend(String(tmpl.minSpend));
    setFormMaxDiscount(String(tmpl.maxDiscount));
    setFormBadge(tmpl.badge);
    setFormDescription(tmpl.desc);
    const start = new Date();
    setFormStartDate(start.toISOString().slice(0, 16));
    const end = new Date(start.getTime() + tmpl.durationDays * 24 * 60 * 60 * 1000);
    setFormEndDate(end.toISOString().slice(0, 16));
    if (onNotify) onNotify(`Template "${tmpl.name}" diterapkan! ✨`, 'success');
  };

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      if (onNotify) onNotify('Kode kupon tidak boleh kosong!', 'error');
      return;
    }
    if (new Date(formStartDate) >= new Date(formEndDate)) {
      if (onNotify) onNotify('Tanggal berakhir promo harus setelah tanggal mulai!', 'error');
      return;
    }

    setSubmitting(true);
    const payload: Partial<SellerCoupon> = {
      sellerId,
      sellerName,
      code: formCode.trim().toUpperCase(),
      name: formName.trim() || 'Promo Toko',
      discountType: formDiscountType,
      value: Number(formValue) || 0,
      minSpend: Number(formMinSpend) || 0,
      maxDiscount: formDiscountType === 'percentage' ? (Number(formMaxDiscount) || 0) : 0,
      quota: Number(formQuota) || 100,
      startDate: formStartDate,
      endDate: formEndDate,
      badge: formBadge,
      description: formDescription.trim(),
      isActive: formIsActive
    };

    if (editingCoupon) {
      const res = await updateVoucherApi(editingCoupon.id, payload);
      if (res.success) {
        if (onNotify) onNotify(res.message, 'success');
        setShowModal(false);
        loadCoupons();
      } else {
        if (onNotify) onNotify(res.message, 'error');
      }
    } else {
      const res = await createVoucherApi(payload);
      if (res.success) {
        if (onNotify) onNotify(res.message, 'success');
        setShowModal(false);
        loadCoupons();
      } else {
        if (onNotify) onNotify(res.message, 'error');
      }
    }
    setSubmitting(false);
  };

  // Toggle Active
  const handleToggle = async (c: SellerCoupon) => {
    const res = await toggleVoucherApi(c.id);
    if (res.success) {
      if (onNotify) onNotify(res.message, 'success');
      loadCoupons();
    }
  };

  // Delete
  const handleDelete = async (c: SellerCoupon) => {
    if (!confirm(`Hapus kupon promo "${c.name}" (${c.code})?`)) return;
    const res = await deleteVoucherApi(c.id);
    if (res.success) {
      if (onNotify) onNotify(res.message, 'success');
      loadCoupons();
    }
  };

  // Copy Code
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (onNotify) onNotify(`Kode "${code}" berhasil disalin! 📋`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper Status
  const getCouponStatus = (c: SellerCoupon) => {
    if (!c.isActive) return { label: 'Dinonaktifkan', color: '#64748B', bg: '#F1F5F9', icon: '⏸️' };
    const now = new Date();
    const start = c.startDate ? new Date(c.startDate) : null;
    const end = c.endDate ? new Date(c.endDate) : null;

    if (start && now < start) {
      return { label: 'Mendatang', color: '#3B82F6', bg: '#EFF6FF', icon: '⏰' };
    }
    if (end && now > end) {
      return { label: 'Kedaluwarsa', color: '#EF4444', bg: '#FEF2F2', icon: '⌛' };
    }
    if (c.quota > 0 && c.usedCount >= c.quota) {
      return { label: 'Kuota Habis', color: '#F59E0B', bg: '#FFFBEB', icon: '🚫' };
    }
    return { label: 'Sedang Aktif', color: '#16A34A', bg: '#F0FDF4', icon: '🟢' };
  };

  // Filtered List
  const filteredCoupons = coupons.filter(c => {
    const status = getCouponStatus(c);
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'running') return status.label === 'Sedang Aktif';
    if (activeFilter === 'scheduled') return status.label === 'Mendatang';
    if (activeFilter === 'ended') return status.label === 'Kedaluwarsa' || status.label === 'Dinonaktifkan' || status.label === 'Kuota Habis';
    return true;
  });

  // Calculate Metrics
  const totalActive = coupons.filter(c => getCouponStatus(c).label === 'Sedang Aktif').length;
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 🌟 BANNER UTAMA MANAJEMEN KUPON */}
      <div
        className="am-card"
        style={{
          padding: '24px 28px',
          borderRadius: 22,
          background: 'linear-gradient(135deg, #1B3826 0%, #2D5A3F 60%, #5FA874 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(27, 56, 38, 0.2)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, backdropFilter: 'blur(4px)', marginBottom: 8 }}>
              <span>🎟️ Fitur Khusus Penjual</span>
              <span>•</span>
              <span>{sellerName}</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900 }}>
              Kupon & Diskon Promosi Toko
            </h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.9, maxWidth: 520, lineHeight: 1.5 }}>
              Tingkatkan daya tarik pembeli dengan membuat kupon diskon persentase, potongan langsung, atau gratis ongkir dengan jangka waktu yang fleksibel! ✨
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            style={{
              padding: '12px 24px',
              borderRadius: 14,
              border: 'none',
              background: '#FFFFFF',
              color: '#1B3826',
              fontWeight: 900,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span style={{ fontSize: 18 }}>+</span> Buat Kupon Baru
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Total Kupon Dibuat</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{coupons.length} Kupon</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Kupon Sedang Berjalan</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2, color: '#4ADE80' }}>{totalActive} Aktif 🟢</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 12 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Total Klaim & Digunakan</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2, color: '#FDE047' }}>{totalUsed}x Transaksi 🎉</div>
          </div>
        </div>
      </div>

      {/* ⚡ TEMPLATE CEPAT 1-KLIK */}
      <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 className="am-heading" style={{ margin: 0, fontSize: 16, color: 'var(--am-text)' }}>
              ⚡ Pasang Template Kupon Cepat
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
              Klik salah satu template di bawah untuk langsung mengisi formulir kupon secara instan
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            {
              name: 'Diskon Mahasiswa 15%',
              codePrefix: 'MHS',
              type: 'percentage' as const,
              value: 15,
              minSpend: 20000,
              maxDiscount: 10000,
              badge: '🎓 Diskon Kampus',
              durationDays: 7,
              desc: 'Diskon 15% untuk seluruh mahasiswa kampus!',
              accent: '#10B981',
              bg: 'rgba(16, 185, 129, 0.08)'
            },
            {
              name: 'Potongan Rp 5.000 Borong',
              codePrefix: 'HEMAT',
              type: 'fixed' as const,
              value: 5000,
              minSpend: 25000,
              maxDiscount: 0,
              badge: '🔥 Hot Promo',
              durationDays: 3,
              desc: 'Potongan langsung Rp 5.000 minimal belanja Rp 25.000',
              accent: '#F59E0B',
              bg: 'rgba(245, 158, 11, 0.08)'
            },
            {
              name: 'Flash Sale Siang 20%',
              codePrefix: 'FLASH',
              type: 'percentage' as const,
              value: 20,
              minSpend: 15000,
              maxDiscount: 15000,
              badge: '⚡ Flash Deal',
              durationDays: 1,
              desc: 'Diskon kilat spesial jam makan siang & istirahat!',
              accent: '#EF4444',
              bg: 'rgba(239, 68, 68, 0.08)'
            },
            {
              name: 'Free Ongkir Kampus Rp 5K',
              codePrefix: 'ONGKIR',
              type: 'shipping' as const,
              value: 5000,
              minSpend: 15000,
              maxDiscount: 0,
              badge: '🛵 Free Ongkir',
              durationDays: 14,
              desc: 'Bebas biaya antar kurir kampus ke seluruh gedung',
              accent: '#3B82F6',
              bg: 'rgba(59, 130, 246, 0.08)'
            }
          ].map((tmpl, idx) => (
            <div
              key={idx}
              onClick={() => {
                handleOpenCreate();
                handleApplyTemplate(tmpl);
              }}
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: `1.5px dashed ${tmpl.accent}`,
                background: tmpl.bg,
                cursor: 'pointer',
                transition: 'transform 0.15s, background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: tmpl.accent, background: 'white', padding: '2px 8px', borderRadius: 6 }}>
                  {tmpl.badge}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)' }}>
                  ⏳ {tmpl.durationDays} Hari
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--am-text)', marginBottom: 4 }}>
                {tmpl.name}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', lineHeight: 1.4 }}>
                {tmpl.desc}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 800, color: tmpl.accent }}>
                + Gunakan Template Ini →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔍 FILTER & DAFTAR KUPON */}
      <div className="am-card" style={{ padding: 20, borderRadius: 20, background: 'var(--am-surface)' }}>
        {/* Controls Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          {/* Subtabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Semua', count: coupons.length },
              { id: 'running', label: '🟢 Sedang Berjalan', count: coupons.filter(c => getCouponStatus(c).label === 'Sedang Aktif').length },
              { id: 'scheduled', label: '⏰ Mendatang', count: coupons.filter(c => getCouponStatus(c).label === 'Mendatang').length },
              { id: 'ended', label: '⌛ Selesai / Nonaktif', count: coupons.filter(c => getCouponStatus(c).label !== 'Sedang Aktif' && getCouponStatus(c).label !== 'Mendatang').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: activeFilter === tab.id ? 'var(--am-primary)' : 'var(--am-bg2)',
                  color: activeFilter === tab.id ? 'white' : 'var(--am-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 8,
                  fontSize: 10,
                  background: activeFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Cari kupon / kode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--am-border)',
              background: 'var(--am-bg2)',
              color: 'var(--am-text)',
              fontSize: 12,
              minWidth: 200,
              outline: 'none'
            }}
          />
        </div>

        {/* Coupon Tickets Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--am-text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div>Memuat daftar kupon tokomu...</div>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--am-bg2)', borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎟️</div>
            <h4 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--am-text)' }}>Belum Ada Kupon Promosi</h4>
            <p style={{ margin: '0 auto 16px', fontSize: 12.5, color: 'var(--am-text-muted)', maxWidth: 380 }}>
              {searchQuery ? 'Tidak ada kupon yang cocok dengan kata kunci pencarian.' : 'Yuk mulai buat kupon diskon pertama untuk tokomu agar pembeli semakin tertarik!'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="am-btn-primary"
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 800, borderRadius: 12 }}
            >
              + Buat Kupon Sekarang
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredCoupons.map(c => {
              const status = getCouponStatus(c);
              const isCopied = copiedCode === c.code;

              return (
                <div
                  key={c.id}
                  style={{
                    borderRadius: 18,
                    border: '1.5px solid var(--am-border)',
                    background: 'var(--am-surface)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  {/* Ticket Header */}
                  <div style={{ padding: '16px 18px 12px', borderBottom: '1.5px dashed var(--am-border)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 8, background: status.bg, color: status.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{status.icon}</span> {status.label}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)' }}>
                        {c.badge}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>
                      {c.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--am-text-muted)', lineHeight: 1.4 }}>
                      {c.description || `Diskon ${c.discountType === 'percentage' ? `${c.value}%` : formatRupiah(c.value)} untuk produk tokomu.`}
                    </p>

                    {/* Left & Right Perforated Holes for Ticket Look */}
                    <div style={{ position: 'absolute', bottom: -10, left: -10, width: 20, height: 20, borderRadius: '50%', background: 'var(--am-bg)', border: '1.5px solid var(--am-border)', zIndex: 3 }} />
                    <div style={{ position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: '50%', background: 'var(--am-bg)', border: '1.5px solid var(--am-border)', zIndex: 3 }} />
                  </div>

                  {/* Ticket Body / Promo Details */}
                  <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Code & Copy Box */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--am-bg2)', borderRadius: 12, border: '1px solid var(--am-border)' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--am-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Kode Kupon</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 1 }}>{c.code}</div>
                      </div>
                      <button
                        onClick={() => handleCopy(c.code)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: isCopied ? '#10B981' : 'var(--am-surface)',
                          color: isCopied ? 'white' : 'var(--am-text)',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        {isCopied ? '✓ Disalin' : 'Salin Kode 📋'}
                      </button>
                    </div>

                    {/* Discount & Min Spend Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11.5 }}>
                      <div style={{ background: 'var(--am-bg2)', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ color: 'var(--am-text-muted)' }}>Potongan: </span>
                        <strong style={{ color: 'var(--am-primary)' }}>
                          {c.discountType === 'percentage'
                            ? `${c.value}% ${c.maxDiscount ? `(Maks ${formatRupiah(c.maxDiscount)})` : ''}`
                            : c.discountType === 'shipping'
                            ? `Ongkir ${formatRupiah(c.value)}`
                            : formatRupiah(c.value)}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--am-bg2)', padding: '8px 10px', borderRadius: 8 }}>
                        <span style={{ color: 'var(--am-text-muted)' }}>Min. Belanja: </span>
                        <strong>{c.minSpend > 0 ? formatRupiah(c.minSpend) : 'Tanpa Min.'}</strong>
                      </div>
                    </div>

                    {/* Date Range Strip */}
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)', background: 'var(--am-bg2)', padding: '8px 10px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mulai:</span>
                        <strong style={{ color: 'var(--am-text)' }}>
                          {c.startDate ? new Date(c.startDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Langsung Aktif'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Berakhir:</span>
                        <strong style={{ color: '#EF4444' }}>
                          {c.endDate ? new Date(c.endDate).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Tidak Terbatas'}
                        </strong>
                      </div>
                    </div>

                    {/* Quota Progress */}
                    {c.quota > 0 && (
                      <div style={{ fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: 'var(--am-text-muted)' }}>Terpakai:</span>
                          <strong>{c.usedCount || 0} / {c.quota} Kuota ({Math.round(((c.usedCount || 0) / c.quota) * 100)}%)</strong>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--am-bg2)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.round(((c.usedCount || 0) / c.quota) * 100))}%`,
                              background: (c.usedCount || 0) >= c.quota ? '#EF4444' : 'var(--am-primary)',
                              borderRadius: 3
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket Footer Actions */}
                  <div style={{ padding: '12px 18px', background: 'var(--am-bg2)', borderTop: '1px solid var(--am-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => handleToggle(c)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--am-border)',
                        background: c.isActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        color: c.isActive ? '#EF4444' : '#10B981',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {c.isActive ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
                    </button>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--am-border)',
                          background: 'var(--am-surface)',
                          color: 'var(--am-text)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL PEMBUATAN / EDIT KUPON DENGAN LIVE TICKET PREVIEW ── */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            className="am-card"
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 24,
              background: 'var(--am-surface)',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--am-border)', paddingBottom: 14 }}>
              <div>
                <h3 className="am-heading" style={{ margin: 0, fontSize: 18, color: 'var(--am-text)' }}>
                  {editingCoupon ? '✏️ Edit Kupon Promosi Toko' : '🎟️ Buat Kupon & Diskon Promosi Baru'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
                  Kupon ini akan langsung berlaku secara otomatis saat pembeli berbelanja di tokomu ({sellerName})
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--am-text-muted)', cursor: 'pointer', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* KOLOM KIRI: FORM INPUT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* 1. Nama Kupon & Kode */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    Nama Promo / Judul Kupon <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Diskon Gajian Mahasiswa 15%"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                      Kode Kupon (Voucher Code) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = Math.floor(Math.random() * 9000 + 1000);
                        const p = (sellerName || 'PROMO').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
                        setFormCode(`${p}${rand}`);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--am-primary)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🎲 Acak Kode
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MYAMMIY15"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-primary)', fontSize: 14, fontWeight: 900, letterSpacing: 1, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>

                {/* 2. Tipe Diskon & Nilai */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    Tipe Diskon & Potongan <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 4 }}>
                    {[
                      { type: 'percentage' as const, label: 'Persen (%)', icon: '📊' },
                      { type: 'fixed' as const, label: 'Nominal (Rp)', icon: '💵' },
                      { type: 'shipping' as const, label: 'Ongkir (Rp)', icon: '🛵' }
                    ].map(t => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setFormDiscountType(t.type)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 10,
                          border: formDiscountType === t.type ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                          background: formDiscountType === t.type ? 'rgba(95,168,116,0.15)' : 'var(--am-bg2)',
                          color: formDiscountType === t.type ? 'var(--am-primary)' : 'var(--am-text-muted)',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: formDiscountType === 'percentage' ? '1fr 1fr' : '1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                      {formDiscountType === 'percentage' ? 'Besar Diskon (%)' : 'Besar Potongan (Rp)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={formDiscountType === 'percentage' ? 100 : 1000000}
                      value={formValue}
                      onChange={e => setFormValue(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, fontWeight: 800, marginTop: 4, boxSizing: 'border-box' }}
                    />
                  </div>

                  {formDiscountType === 'percentage' && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                        Maks. Potongan (Rp)
                      </label>
                      <input
                        type="number"
                        placeholder="0 = Tanpa batas"
                        value={formMaxDiscount}
                        onChange={e => setFormMaxDiscount(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Minimal Belanja & Kuota */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                      Min. Belanja Toko (Rp)
                    </label>
                    <input
                      type="number"
                      value={formMinSpend}
                      onChange={e => setFormMinSpend(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                      Kuota Kupon (Pakai)
                    </label>
                    <input
                      type="number"
                      value={formQuota}
                      onChange={e => setFormQuota(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, marginTop: 4, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* 4. JANGKA WAKTU PROMO (DARI KAPAN SAMPAI KAPAN) */}
                <div style={{ background: 'var(--am-bg2)', padding: 14, borderRadius: 14, border: '1px solid var(--am-border)' }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)', display: 'block', marginBottom: 4 }}>
                    ⏳ Jangka Waktu Promo (Mulai s/d Selesai)
                  </label>

                  {/* Preset Durasi Cepat */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[
                      { label: '⚡ 3 Jam', hours: 3 },
                      { label: '📅 1 Hari', hours: 24 },
                      { label: '📅 3 Hari', hours: 72 },
                      { label: '📅 1 Minggu', hours: 168 },
                      { label: '📅 1 Bulan', hours: 720 },
                    ].map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyDurationPreset(p.hours)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--am-border)',
                          background: 'var(--am-surface)',
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          color: 'var(--am-text)'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Tanggal & Jam Mulai:</span>
                      <input
                        type="datetime-local"
                        required
                        value={formStartDate}
                        onChange={e => setFormStartDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 11.5, marginTop: 2, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Tanggal & Jam Berakhir:</span>
                      <input
                        type="datetime-local"
                        required
                        value={formEndDate}
                        onChange={e => setFormEndDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 11.5, marginTop: 2, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Badge & Deskripsi */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    Pilih Ikon / Label Badge
                  </label>
                  <select
                    value={formBadge}
                    onChange={e => setFormBadge(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 12.5, marginTop: 4 }}
                  >
                    {BADGE_OPTIONS.map((b, i) => (
                      <option key={i} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    Deskripsi / Syarat Ketentuan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Berlaku untuk semua produk makanan & suvenir kampus."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 12, marginTop: 4, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              {/* KOLOM KANAN: LIVE TICKET PREVIEW */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text-muted)' }}>
                  👁️ Tampilan Tiket Kupon (Live Preview Pembeli)
                </label>

                {/* Aesthetic Ticket Card Preview */}
                <div
                  style={{
                    borderRadius: 20,
                    border: '2px solid var(--am-primary)',
                    background: 'linear-gradient(135deg, var(--am-surface) 0%, var(--am-bg2) 100%)',
                    boxShadow: '0 8px 25px rgba(95,168,116,0.15)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div style={{ padding: 18, borderBottom: '2px dashed var(--am-primary)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'white', background: 'var(--am-primary)', padding: '2px 8px', borderRadius: 6 }}>
                        {formBadge || '🎟️ Promo'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#16A34A' }}>
                        Toko: {sellerName}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: 'var(--am-text)' }}>
                      {formName || 'Nama Kupon Toko'}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--am-text-muted)' }}>
                      {formDescription || 'Diskon spesial langsung dari toko penjual.'}
                    </p>

                    {/* Perforated Cuts */}
                    <div style={{ position: 'absolute', bottom: -12, left: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--am-surface)', border: '2px solid var(--am-primary)', zIndex: 2 }} />
                    <div style={{ position: 'absolute', bottom: -12, right: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--am-surface)', border: '2px solid var(--am-primary)', zIndex: 2 }} />
                  </div>

                  <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(95,168,116,0.12)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--am-primary)', fontWeight: 800 }}>KODE PROMO</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--am-primary)', letterSpacing: 1 }}>{formCode || 'KODE'}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-primary)', background: 'white', padding: '4px 10px', borderRadius: 8 }}>
                        {formDiscountType === 'percentage' ? `Diskon ${formValue}%` : `Potongan ${formatRupiah(Number(formValue) || 0)}`}
                      </span>
                    </div>

                    <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>• Minimal Belanja: <strong>{Number(formMinSpend) > 0 ? formatRupiah(Number(formMinSpend)) : 'Tanpa Minimum'}</strong></div>
                      {formDiscountType === 'percentage' && Number(formMaxDiscount) > 0 && (
                        <div>• Maksimal Potongan: <strong>{formatRupiah(Number(formMaxDiscount))}</strong></div>
                      )}
                      <div>• Kuota: <strong>{formQuota} Penggunaan</strong></div>
                      <div>• Periode: <strong>{formStartDate ? new Date(formStartDate).toLocaleDateString('id-ID') : 'Hari ini'} s/d {formEndDate ? new Date(formEndDate).toLocaleDateString('id-ID') : 'Selesai'}</strong></div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="am-btn-primary"
                    style={{ flex: 2, padding: '12px', borderRadius: 12, fontWeight: 900, fontSize: 13, cursor: submitting ? 'wait' : 'pointer' }}
                  >
                    {submitting ? 'Menyimpan Kupon...' : (editingCoupon ? 'Simpan Perubahan 💾' : '🚀 Terbitkan Kupon Sekarang')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
