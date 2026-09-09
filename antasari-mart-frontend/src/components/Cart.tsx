import { useState, useEffect } from 'react';
import type { CartItem, ThemeMode, Product, SellerCoupon } from '../types';
import { formatRupiah, MOCK_PRODUCTS } from '../data';
import { getVouchersApi, validateVoucherApi } from '../lib/api';

interface CartProps {
  theme: ThemeMode;
  items: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
  onAddToCart?: (product: Product, qty: number) => void;
}

export default function Cart({
  theme,
  items,
  onUpdateQty,
  onRemove,
  onCheckout,
  onContinueShopping,
  onAddToCart
}: CartProps) {
  const isAesthetic = theme === 'aesthetic';

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup' | 'vending'>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') : null) as any || 'delivery';
  });

  const [availableCoupons, setAvailableCoupons] = useState<SellerCoupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<SellerCoupon | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('am_applied_coupon');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryDiscount, setDeliveryDiscount] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => items.map(i => i.product.id));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync selected items when items change
  const activeSelectedItems = items.filter(i => selectedItemIds.includes(i.product.id));

  const subtotal = activeSelectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalItemsCount = activeSelectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const rawDeliveryFee = deliveryMethod === 'delivery' ? 5000 : 0;

  // Load available coupons from sellers
  useEffect(() => {
    const fetchCoupons = async () => {
      const res = await getVouchersApi(undefined, true);
      if (res && res.success && res.vouchers) {
        setAvailableCoupons(res.vouchers);
      }
    };
    fetchCoupons();
  }, []);

  // Recalculate discount automatically whenever subtotal, items, or coupon changes
  useEffect(() => {
    if (!appliedCoupon) {
      setDiscountAmount(0);
      setDeliveryDiscount(0);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('am_applied_coupon');
      }
      return;
    }

    const recompute = async () => {
      const res = await validateVoucherApi(
        appliedCoupon.code,
        activeSelectedItems,
        subtotal,
        rawDeliveryFee
      );

      if (res && res.success) {
        setDiscountAmount(res.discountAmount || 0);
        setDeliveryDiscount(res.deliveryDiscount || 0);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('am_applied_coupon', JSON.stringify({
            voucher: res.voucher || appliedCoupon,
            discountAmount: res.discountAmount || 0,
            deliveryDiscount: res.deliveryDiscount || 0,
            totalSavings: res.totalSavings || 0
          }));
        }
      } else {
        // If conditions no longer met (e.g. subtotal dropped below minSpend)
        setDiscountAmount(0);
        setDeliveryDiscount(0);
        setCouponError(res.message || 'Kupon tidak lagi memenuhi syarat minimal belanja.');
        setAppliedCoupon(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('am_applied_coupon');
        }
      }
    };

    recompute();
  }, [appliedCoupon?.code, subtotal, activeSelectedItems.length, rawDeliveryFee]);

  const finalDeliveryFee = Math.max(0, rawDeliveryFee - deliveryDiscount);
  const total = Math.max(0, subtotal - discountAmount + (activeSelectedItems.length > 0 ? finalDeliveryFee : 0));
  const totalSavings = discountAmount + deliveryDiscount;

  // Cek apakah ada produk yang tidak sesuai untuk Vending Machine
  const isVendingItem = (p: any) => {
    if (!p) return false;
    const name = (p.name || p.nama_produk || '').toLowerCase();
    const desc = (p.description || p.deskripsi || '').toLowerCase();
    const seller = (p.sellerId || p.sellerName || p.seller_name || '').toLowerCase();
    const category = (p.category || p.kategori || '').toLowerCase();

    return (
      p.slotNumber !== undefined ||
      p.isVending === true ||
      p.id === 'blind_bag_myammiy_35k' ||
      seller.includes('myammiy') ||
      seller.includes('seller_1') ||
      name.includes('ganci') ||
      name.includes('gantungan') ||
      name.includes('blind bag') ||
      name.includes('blindbag') ||
      name.includes('keychain') ||
      name.includes('pipe cleaner') ||
      name.includes('kawat bulu') ||
      name.includes('chenille') ||
      name.includes('rajut') ||
      name.includes('bando') ||
      name.includes('snack') ||
      name.includes('keripik') ||
      name.includes('roti') ||
      name.includes('aksesoris') ||
      category === 'kerajinan' ||
      category === 'aksesoris' ||
      desc.includes('ganci') ||
      desc.includes('blind bag') ||
      desc.includes('vending')
    );
  };

  const hasInvalidVendingItems = activeSelectedItems.some(i => deliveryMethod === 'vending' && !isVendingItem(i.product));

  const handleMethodChange = (method: 'delivery' | 'pickup' | 'vending') => {
    setDeliveryMethod(method);
    if (typeof window !== 'undefined') {
      localStorage.setItem('am_delivery_method', method);
    }
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    setCouponError('');
    setCouponSuccess('');

    if (!code) {
      setCouponError('Ketik kode promo terlebih dahulu.');
      return;
    }

    const res = await validateVoucherApi(code, activeSelectedItems, subtotal, rawDeliveryFee);
    if (!res.success) {
      setCouponError(res.message);
      return;
    }

    if (res.voucher) {
      setAppliedCoupon(res.voucher);
      setDiscountAmount(res.discountAmount || 0);
      setDeliveryDiscount(res.deliveryDiscount || 0);
      setCouponSuccess(`Kupon "${res.voucher.name}" berhasil dipasang! Potongan ${formatRupiah((res.discountAmount || 0) + (res.deliveryDiscount || 0))} 🎉`);
      setCouponInput('');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('am_applied_coupon', JSON.stringify({
          voucher: res.voucher,
          discountAmount: res.discountAmount || 0,
          deliveryDiscount: res.deliveryDiscount || 0,
          totalSavings: (res.discountAmount || 0) + (res.deliveryDiscount || 0)
        }));
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map(i => i.product.id));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRemoveSelected = () => {
    selectedItemIds.forEach(id => onRemove(id));
    setSelectedItemIds([]);
    setShowDeleteConfirm(false);
  };

  const handleOpenNote = (id: string) => {
    setActiveNoteItemId(id);
    setTempNoteText(itemNotes[id] || '');
  };

  const handleSaveNote = (id: string) => {
    setItemNotes(prev => ({ ...prev, [id]: tempNoteText.trim() }));
    setActiveNoteItemId(null);
  };

  // Group items by seller
  const bySeller = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = `${item.product.sellerId || 'seller'}::${item.product.sellerName || 'Penjual Antasari'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Recommendation products that are not currently in cart
  const cartProductIds = new Set(items.map(i => i.product.id));
  const recommendedProducts = MOCK_PRODUCTS.filter(p => !cartProductIds.has(p.id)).slice(0, 4);

  // Empty State View
  if (items.length === 0) {
    return (
      <div style={{ padding: '20px 14px 80px', maxWidth: 1120, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--am-primary)', fontWeight: 800, fontSize: 12.5 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
            Keranjang Belanja
          </div>
          <span style={{ color: 'var(--am-border)', fontSize: 14 }}>➔</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--am-text-muted)', fontWeight: 600, fontSize: 12.5 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--am-bg2)', border: '1px solid var(--am-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</span>
            Pengiriman
          </div>
          <span style={{ color: 'var(--am-border)', fontSize: 14 }}>➔</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--am-text-muted)', fontWeight: 600, fontSize: 12.5 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--am-bg2)', border: '1px solid var(--am-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>3</span>
            Pembayaran
          </div>
        </div>

        {/* Empty State Hero Card */}
        <div
          className="am-card"
          style={{
            padding: '48px 20px',
            textAlign: 'center',
            borderRadius: 24,
            marginBottom: 32,
            background: 'var(--am-surface)',
            boxShadow: '0 10px 30px rgba(95, 168, 116, 0.08)',
            border: '1.5px dashed var(--am-border)'
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {isAesthetic ? '🛍️' : '🛒'}
          </div>
          <h2 className="am-heading" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--am-text)' }}>
            Keranjang Belanja Kamu Kosong
          </h2>
          <p style={{ margin: '0 auto 24px', fontSize: 13, color: 'var(--am-text-muted)', maxWidth: 440, lineHeight: 1.5 }}>
            Yuk temukan aneka makanan lezat, minuman segar, kerajinan tangan Myammiy, dan perlengkapan kampus UIN Antasari!
          </p>
          <button
            className="am-btn-primary"
            style={{
              padding: '12px 32px',
              fontSize: 14,
              borderRadius: 14,
              fontWeight: 800,
              boxShadow: '0 4px 16px rgba(95, 168, 116, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
            onClick={onContinueShopping}
          >
            <span>🚀</span> Mulai Belanja Sekarang
          </button>
        </div>

        {/* Rekomendasi Terlaris dalam 2 Kolom */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 className="am-heading" style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--am-text)' }}>
                🔥 Rekomendasi Terlaris Kampus
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--am-text-muted)' }}>
                Paling banyak dibeli oleh mahasiswa minggu ini
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {recommendedProducts.map(prod => (
              <div
                key={prod.id}
                className="am-card am-cart-card"
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'var(--am-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid var(--am-border)'
                }}
              >
                <div style={{ position: 'relative', height: 130, background: 'var(--am-bg2)', overflow: 'hidden' }}>
                  <img
                    src={prod.image}
                    alt={prod.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {prod.isKoperasi && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: 'var(--am-primary)', color: 'white', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>
                      🏛️ KOPERASI
                    </span>
                  )}
                  <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5 }}>
                    ⭐ {prod.rating}
                  </span>
                </div>
                <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)', fontWeight: 600, marginBottom: 2 }}>
                    🏪 {prod.sellerName}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.25, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {prod.name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--am-primary)', marginTop: 'auto', marginBottom: 10 }}>
                    {formatRupiah(prod.price)}
                  </div>
                  <button
                    onClick={() => onAddToCart ? onAddToCart(prod, 1) : onContinueShopping()}
                    style={{
                      width: '100%',
                      padding: '7px 0',
                      borderRadius: 10,
                      border: '1.5px solid var(--am-primary)',
                      background: 'var(--am-primary-light, rgba(95,168,116,0.12))',
                      color: 'var(--am-primary)',
                      fontWeight: 800,
                      fontSize: 11.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <span>+</span> Keranjang
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 12px 120px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      
      {/* ── STEP PROGRESS INDICATOR ── */}
      <div
        className="am-card"
        style={{
          padding: '12px 16px',
          borderRadius: 16,
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--am-surface)',
          border: '1px solid var(--am-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>
            1
          </span>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-primary)', lineHeight: 1.2 }}>Keranjang</div>
            <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>2 Kolom Produk</div>
          </div>
        </div>

        <div style={{ height: 2, flex: 1, background: 'var(--am-border)', margin: '0 10px', maxWidth: 40 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.65 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--am-bg2)', border: '1px solid var(--am-border)', color: 'var(--am-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
            2
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.2 }}>Pengiriman</div>
            <div style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>Kurir Kampus</div>
          </div>
        </div>

        <div style={{ height: 2, flex: 1, background: 'var(--am-border)', margin: '0 10px', maxWidth: 40 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.65 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--am-bg2)', border: '1px solid var(--am-border)', color: 'var(--am-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
            3
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.2 }}>Bayar</div>
            <div style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>QRIS & COD</div>
          </div>
        </div>
      </div>

      {/* ── HEADER TITLE & TOP ACTIONS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h1 className="am-heading" style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛒 Keranjang Belanja</span>
            <span style={{ fontSize: 12, background: 'var(--am-primary-light, rgba(95,168,116,0.15))', color: 'var(--am-primary)', padding: '3px 10px', borderRadius: 16, fontWeight: 800 }}>
              {items.length} Barang
            </span>
          </h1>
        </div>

        <button
          onClick={onContinueShopping}
          style={{
            padding: '7px 14px',
            borderRadius: 12,
            border: '1.5px solid var(--am-border)',
            background: 'var(--am-surface)',
            color: 'var(--am-text)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>🔍</span> Belanja Lagi
        </button>
      </div>

      {/* ── BATCH CONTROLS BAR (PILIH SEMUA & HAPUS TERPILIH) ── */}
      <div
        className="am-card"
        style={{
          padding: '10px 14px',
          borderRadius: 14,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: 'var(--am-surface)',
          border: '1px solid var(--am-border)'
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800, color: 'var(--am-text)' }}>
          <input
            type="checkbox"
            checked={selectedItemIds.length === items.length && items.length > 0}
            onChange={handleToggleSelectAll}
            style={{ width: 18, height: 18, accentColor: '#5FA874', cursor: 'pointer' }}
          />
          <span>Pilih Semua ({items.length})</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {activeSelectedItems.length > 0 && (
            <span style={{ fontSize: 11, background: 'var(--am-primary-light, rgba(95,168,116,0.15))', color: 'var(--am-primary)', padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>
              {activeSelectedItems.length} terpilih ({totalItemsCount} pcs)
            </span>
          )}

          {selectedItemIds.length > 0 && (
            <div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #FECACA',
                    color: '#EF4444',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Hapus ({selectedItemIds.length})
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF2F2', padding: '2px 6px', borderRadius: 8 }}>
                  <button
                    onClick={handleRemoveSelected}
                    style={{ background: '#DC2626', color: 'white', border: 'none', padding: '3px 7px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ background: 'transparent', color: '#4B5563', border: 'none', padding: '3px 5px', fontSize: 11, cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN RESPONSIVE LAYOUT (LEFT: 2-COL PRODUCTS, RIGHT: STICKY CHECKOUT) ── */}
      <div className="am-cart-layout">
        
        {/* ========================================================= */}
        {/* KOLOM KIRI: DAFTAR PRODUK DALAM GRID 2 KOLOM (BERDAMPINGAN)*/}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(bySeller).map(([sellerKey, sellerItems]) => {
            const sellerName = sellerKey.split('::')[1];
            const isKoperasi = sellerItems[0]?.product?.isKoperasi;
            const allInSellerSelected = sellerItems.every(i => selectedItemIds.includes(i.product.id));

            return (
              <div
                key={sellerKey}
                className="am-card"
                style={{
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: 'var(--am-surface)',
                  border: '1px solid var(--am-border)'
                }}
              >
                {/* Header Toko */}
                <div
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--am-border)',
                    background: isKoperasi ? 'rgba(95, 168, 116, 0.08)' : 'var(--am-bg2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={allInSellerSelected}
                      onChange={() => {
                        const sellerProdIds = sellerItems.map(i => i.product.id);
                        if (allInSellerSelected) {
                          setSelectedItemIds(prev => prev.filter(id => !sellerProdIds.includes(id)));
                        } else {
                          setSelectedItemIds(prev => Array.from(new Set([...prev, ...sellerProdIds])));
                        }
                      }}
                      style={{ width: 17, height: 17, accentColor: '#5FA874', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 17 }}>{isKoperasi ? '🏛️' : '🏪'}</span>
                    <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--am-text)' }}>{sellerName}</span>
                    {isKoperasi && (
                      <span className="am-tag-koperasi" style={{ fontSize: 9.5, padding: '1px 6px' }}>KOPERASI</span>
                    )}
                  </div>

                  <span style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 600 }}>
                    {sellerItems.filter(i => selectedItemIds.includes(i.product.id)).length}/{sellerItems.length} dipilih
                  </span>
                </div>

                {/* ── 2-COLUMN GRID OF PRODUCT CARDS (BERDAMPINGAN 2 KOTAK 2 KOTAK) ── */}
                <div style={{ padding: '10px', background: 'var(--am-surface)' }}>
                  <div className="am-cart-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {sellerItems.map(item => {
                      const isSelected = selectedItemIds.includes(item.product.id);
                      const isNoteOpen = activeNoteItemId === item.product.id;
                      const itemNote = itemNotes[item.product.id] || '';
                      const isItemVendingCompatible = isVendingItem(item.product);
                      const itemTotal = item.product.price * item.quantity;
                      const isLowStock = item.product.stock <= 5;

                      return (
                        <div
                          key={item.product.id}
                          className="am-card am-cart-card"
                          style={{
                            borderRadius: 16,
                            border: isSelected ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                            background: isSelected ? 'var(--am-surface)' : 'var(--am-bg2)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: isSelected ? '0 3px 12px rgba(95, 168, 116, 0.12)' : 'none',
                            opacity: isSelected ? 1 : 0.82,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* 📸 Top Image Container with Overlays */}
                          <div style={{ position: 'relative', width: '100%', height: 130, background: 'var(--am-bg2)', overflow: 'hidden' }}>
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />

                            {/* Checkbox Floating on Top Left */}
                            <div
                              style={{
                                position: 'absolute',
                                top: 6,
                                left: 6,
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                background: 'rgba(255,255,255,0.92)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                zIndex: 2
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectItem(item.product.id)}
                                style={{ width: 16, height: 16, accentColor: '#5FA874', cursor: 'pointer', margin: 0 }}
                              />
                            </div>

                            {/* Delete Button Floating on Top Right */}
                            <button
                              onClick={() => onRemove(item.product.id)}
                              title="Hapus dari keranjang"
                              style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                background: 'rgba(255,255,255,0.92)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                color: '#EF4444',
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                zIndex: 2
                              }}
                            >
                              🗑️
                            </button>

                            {/* Low Stock or Category Tag */}
                            {isLowStock ? (
                              <span style={{ position: 'absolute', bottom: 6, left: 6, background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, zIndex: 2 }}>
                                Sisa {item.product.stock}
                              </span>
                            ) : (
                              <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 8.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize', zIndex: 2 }}>
                                {item.product.category || 'Umum'}
                              </span>
                            )}
                          </div>

                          {/* 📋 Product Details Body */}
                          <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: 800,
                                color: 'var(--am-text)',
                                lineHeight: 1.25,
                                marginBottom: 4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                              title={item.product.name}
                            >
                              {item.product.name}
                            </div>

                            {/* Price & Subtotal */}
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--am-primary)' }}>
                                {formatRupiah(item.product.price)}
                              </div>
                              <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>
                                Subtotal: <strong style={{ color: 'var(--am-text)' }}>{formatRupiah(itemTotal)}</strong>
                              </div>
                            </div>

                            {/* Vending Indicator */}
                            {deliveryMethod === 'vending' && (
                              <div style={{ marginBottom: 8 }}>
                                {isItemVendingCompatible ? (
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 5px', borderRadius: 4 }}>
                                    ✓ Vending OK
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 5px', borderRadius: 4 }}>
                                    ⚠️ Butuh Kurir
                                  </span>
                                )}
                              </div>
                            )}

                            {/* 🔢 Stepper Controls (Modern Pill Layout) */}
                            <div
                              style={{
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1.5px solid var(--am-border)',
                                borderRadius: 10,
                                overflow: 'hidden',
                                background: 'var(--am-surface)'
                              }}
                            >
                              <button
                                className="am-cart-stepper-btn"
                                onClick={() => item.quantity === 1 ? onRemove(item.product.id) : onUpdateQty(item.product.id, item.quantity - 1)}
                                title={item.quantity === 1 ? 'Hapus' : 'Kurang'}
                                style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--am-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                {item.quantity === 1 ? '🗑️' : '−'}
                              </button>
                              <span style={{ textAlign: 'center', fontWeight: 900, fontSize: 12, color: 'var(--am-text)', flex: 1 }}>
                                {item.quantity}
                              </span>
                              <button
                                className="am-cart-stepper-btn"
                                onClick={() => onUpdateQty(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                                disabled={item.quantity >= item.product.stock}
                                title={item.quantity >= item.product.stock ? 'Maksimal stok tercapai' : 'Tambah'}
                                style={{
                                  width: 28,
                                  height: 28,
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: item.quantity >= item.product.stock ? 'not-allowed' : 'pointer',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: item.quantity >= item.product.stock ? '#CBD5E1' : 'var(--am-text)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                +
                              </button>
                            </div>

                            {/* ✍️ Catatan Penjual */}
                            <div style={{ marginTop: 6 }}>
                              {!isNoteOpen && !itemNote && (
                                <button
                                  onClick={() => handleOpenNote(item.product.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--am-primary)',
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    padding: 0,
                                    width: '100%',
                                    textAlign: 'left'
                                  }}
                                >
                                  + Catatan
                                </button>
                              )}

                              {!isNoteOpen && itemNote && (
                                <div
                                  onClick={() => handleOpenNote(item.product.id)}
                                  style={{
                                    padding: '3px 6px',
                                    background: 'var(--am-primary-light, rgba(95,168,116,0.12))',
                                    borderRadius: 6,
                                    fontSize: 10,
                                    color: 'var(--am-text)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    📝 <em>{itemNote}</em>
                                  </span>
                                </div>
                              )}

                              {isNoteOpen && (
                                <div style={{ marginTop: 4, background: 'var(--am-bg2)', padding: 6, borderRadius: 8, border: '1px solid var(--am-border)' }}>
                                  <input
                                    type="text"
                                    placeholder="Tulis catatan..."
                                    value={tempNoteText}
                                    onChange={e => setTempNoteText(e.target.value)}
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      padding: '4px 6px',
                                      borderRadius: 6,
                                      border: '1px solid var(--am-border)',
                                      background: 'var(--am-surface)',
                                      color: 'var(--am-text)',
                                      fontSize: 10.5,
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                      marginBottom: 4
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveNote(item.product.id);
                                    }}
                                  />
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                    <button
                                      onClick={() => setActiveNoteItemId(null)}
                                      style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--am-text-muted)', fontSize: 10, cursor: 'pointer' }}
                                    >
                                      Batal
                                    </button>
                                    <button
                                      onClick={() => handleSaveNote(item.product.id)}
                                      style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: 'var(--am-primary)', color: 'white', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                                    >
                                      Simpan
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })}

          {/* Rekomendasi Pelengkap */}
          <div className="am-card" style={{ padding: 14, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 10px', fontSize: 14.5, fontWeight: 800, color: 'var(--am-text)' }}>
              ✨ Lengkapi Belanjaanmu
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {recommendedProducts.slice(0, 2).map(prod => (
                <div
                  key={prod.id}
                  className="am-card"
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                  />
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--am-text)', lineHeight: 1.2, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {prod.name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--am-primary)', marginTop: 'auto', marginBottom: 6 }}>
                    {formatRupiah(prod.price)}
                  </div>
                  <button
                    onClick={() => onAddToCart && onAddToCart(prod, 1)}
                    style={{
                      padding: '5px 0',
                      borderRadius: 8,
                      border: 'none',
                      background: 'var(--am-primary)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 10.5,
                      cursor: 'pointer'
                    }}
                  >
                    + Tambah
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* KOLOM KANAN: STICKY CHECKOUT BOX & RINCIAN TRANSAKSI      */}
        {/* ========================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 76 }}>
          
          {/* 1. METODE PENGAMBILAN */}
          <div className="am-card" style={{ padding: 16, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 800, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📦</span> Metode Pengambilan
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Delivery */}
              <div
                onClick={() => handleMethodChange('delivery')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: deliveryMethod === 'delivery' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
                  background: deliveryMethod === 'delivery' ? 'var(--am-primary-light, rgba(95, 168, 116, 0.12))' : 'var(--am-bg2)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🛵</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>Kurir Kampus</div>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Diantar ke kelas (~15-25 mnt)</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-primary)' }}>{formatRupiah(5000)}</span>
              </div>

              {/* Pick-Up */}
              <div
                onClick={() => handleMethodChange('pickup')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: deliveryMethod === 'pickup' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
                  background: deliveryMethod === 'pickup' ? 'var(--am-primary-light, rgba(95, 168, 116, 0.12))' : 'var(--am-bg2)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🏪</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>Ambil Sendiri</div>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Stand kasir Koperasi</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#16A34A', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                  GRATIS
                </span>
              </div>

              {/* Vending Machine */}
              <div
                onClick={() => handleMethodChange('vending')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: deliveryMethod === 'vending' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
                  background: deliveryMethod === 'vending' ? 'var(--am-primary-light, rgba(95, 168, 116, 0.12))' : 'var(--am-bg2)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--am-text)' }}>Vending Machine</div>
                    <div style={{ fontSize: 10.5, color: 'var(--am-text-muted)' }}>Token QR di Loker Mesin</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#16A34A', background: '#DCFCE7', padding: '2px 6px', borderRadius: 4 }}>
                  GRATIS
                </span>
              </div>
            </div>

            {hasInvalidVendingItems && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: 11, fontWeight: 600 }}>
                ⚠️ Ada produk berukuran besar, pilih <strong>Kurir</strong> atau <strong>Ambil Sendiri</strong>.
              </div>
            )}
          </div>

          {/* 2. VOUCHER & KUPON DISKON */}
          <div className="am-card" style={{ padding: 16, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 10px', fontSize: 14.5, fontWeight: 800, color: 'var(--am-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🎟️</span> Kupon & Voucher Diskon
            </h3>

            {/* Input Promo */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Kode promo (misal: MHSANTASARI)"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleApplyCoupon();
                }}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1.5px solid var(--am-border)',
                  background: 'var(--am-bg2)',
                  color: 'var(--am-text)',
                  fontSize: 11.5,
                  fontWeight: 800,
                  outline: 'none'
                }}
              />
              <button
                onClick={() => handleApplyCoupon()}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--am-primary)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Pakai
              </button>
            </div>

            {/* Quick Click Kupon Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
              {availableCoupons.slice(0, 4).map(c => {
                const isCurrent = appliedCoupon?.code === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => handleApplyCoupon(c.code)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: isCurrent ? '1.5px solid var(--am-primary)' : '1px dashed var(--am-border)',
                      background: isCurrent ? 'var(--am-primary-light, rgba(95,168,116,0.18))' : 'var(--am-bg2)',
                      color: isCurrent ? 'var(--am-primary)' : 'var(--am-text)',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10 }}>{c.badge || '🎟️'}</span>
                      <span style={{ fontSize: 9, opacity: 0.8, color: 'var(--am-primary)' }}>{c.sellerName ? c.sellerName.split(' ')[0] : 'Toko'}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 900 }}>{c.code}</div>
                    <div style={{ fontSize: 9.5, opacity: 0.85 }}>
                      {c.discountType === 'percentage' ? `Diskon ${c.value}%` : `Potongan ${formatRupiah(c.value)}`}
                    </div>
                  </button>
                );
              })}
            </div>

            {couponSuccess && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{couponSuccess}</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponSuccess(''); }} style={{ background: 'none', border: 'none', color: '#15803D', cursor: 'pointer', fontWeight: 900 }}>✕</button>
              </div>
            )}
            {couponError && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                {couponError}
              </div>
            )}
          </div>

          {/* 3. RINGKASAN PEMBAYARAN */}
          <div className="am-card" style={{ padding: 18, borderRadius: 18, background: 'var(--am-surface)', border: '1px solid var(--am-border)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--am-text)' }}>
              Ringkasan Pembayaran
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--am-text-muted)' }}>
                <span>Subtotal ({activeSelectedItems.length} produk, {totalItemsCount} pcs)</span>
                <span style={{ fontWeight: 800, color: 'var(--am-text)' }}>{formatRupiah(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--am-text-muted)' }}>
                <span>Ongkir ({deliveryMethod === 'delivery' ? 'Kurir' : deliveryMethod === 'pickup' ? 'Pick-Up' : 'Vending'})</span>
                <span style={{ fontWeight: 800, color: rawDeliveryFee === 0 ? '#16A34A' : 'var(--am-text)' }}>
                  {rawDeliveryFee === 0 ? 'GRATIS' : formatRupiah(rawDeliveryFee)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 800 }}>
                  <span>Diskon Kupon</span>
                  <span>- {formatRupiah(discountAmount)}</span>
                </div>
              )}

              {deliveryDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 800 }}>
                  <span>Diskon Ongkir</span>
                  <span>- {formatRupiah(deliveryDiscount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--am-text-muted)' }}>
                <span>Biaya Layanan</span>
                <span style={{ fontWeight: 800, color: '#16A34A' }}>GRATIS</span>
              </div>

              <hr className="am-divider" style={{ margin: '4px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--am-text)' }}>Total Tagihan</div>
                  {totalSavings > 0 && (
                    <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 800, marginTop: 2 }}>
                      🎉 Hemat {formatRupiah(totalSavings)}!
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--am-primary)' }}>
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            {/* CTA CHECKOUT BUTTON */}
            <button
              className="am-btn-primary"
              disabled={activeSelectedItems.length === 0 || hasInvalidVendingItems}
              style={{
                width: '100%',
                padding: '14px 0',
                fontSize: 14.5,
                borderRadius: 12,
                marginTop: 16,
                opacity: (activeSelectedItems.length === 0 || hasInvalidVendingItems) ? 0.5 : 1,
                cursor: (activeSelectedItems.length === 0 || hasInvalidVendingItems) ? 'not-allowed' : 'pointer',
                boxShadow: (activeSelectedItems.length > 0 && !hasInvalidVendingItems) ? '0 4px 16px rgba(95, 168, 116, 0.4)' : 'none',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onClick={() => {
                if (activeSelectedItems.length === 0 || hasInvalidVendingItems) return;
                onCheckout();
              }}
            >
              {hasInvalidVendingItems ? (
                '⚠️ Ganti Metode Vending'
              ) : activeSelectedItems.length === 0 ? (
                'Pilih Minimal 1 Produk'
              ) : (
                <>
                  <span>Lanjut Pembayaran ({activeSelectedItems.length})</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </div>

          {/* Jaminan Kampus */}
          <div className="am-card" style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--am-bg2)', border: '1px solid var(--am-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, color: 'var(--am-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🛡️</span>
                <span><strong>100% Halal:</strong> Terverifikasi Koperasi Kampus UIN.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚡</span>
                <span><strong>Kurir Kilat:</strong> Diantar mahasiswa terpercaya.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💳</span>
                <span><strong>Bayar Mudah:</strong> QRIS, COD, atau Saldo.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}