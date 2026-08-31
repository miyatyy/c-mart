import { useState } from 'react'
import type { CartItem, ThemeMode } from '../types'
import { formatRupiah } from '../data'

interface CartProps {
  theme: ThemeMode
  items: CartItem[]
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onCheckout: () => void
  onContinueShopping: () => void
}

export default function Cart({ theme, items, onUpdateQty, onRemove, onCheckout, onContinueShopping }: CartProps) {
  const isAesthetic = theme === 'aesthetic'
  
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup' | 'vending'>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('am_delivery_method') : null) as any || 'delivery'
  })

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const deliveryFee = deliveryMethod === 'delivery' ? 5000 : 0
  const total = subtotal + (items.length > 0 ? deliveryFee : 0)

  // 💡 Cek apakah ada produk yang tidak sesuai untuk Vending Machine (misal bukan ganci/snack kecil/blind bag)
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

  const hasInvalidVendingItems = items.some(i => deliveryMethod === 'vending' && !isVendingItem(i.product));

  const handleMethodChange = (method: 'delivery' | 'pickup' | 'vending') => {
    setDeliveryMethod(method)
    if (typeof window !== 'undefined') {
      localStorage.setItem('am_delivery_method', method)
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16 }}>
        <div style={{ fontSize: 72 }}>{isAesthetic ? '🛍️' : '🛒'}</div>
        <h2 className="am-heading" style={{ margin: 0, fontSize: 22, color: 'var(--am-text)' }}>Keranjang Kosong</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--am-text-muted)', textAlign: 'center' }}>
          Belum ada produk yang ditambahkan. Yuk mulai belanja!
        </p>
        <button className="am-btn-primary" style={{ padding: '12px 32px', fontSize: 14 }} onClick={onContinueShopping}>
          Mulai Belanja
        </button>
      </div>
    )
  }

  // Group by seller
  const bySeller = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = `${item.product.sellerId}::${item.product.sellerName}`
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <h2 className="am-heading" style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--am-text)' }}>
        🛒 Keranjang Belanja
      </h2>

      {Object.entries(bySeller).map(([sellerKey, sellerItems]) => {
        const sellerName = sellerKey.split('::')[1]
        const isKoperasi = sellerItems[0].product.isKoperasi
        return (
          <div key={sellerKey} className="am-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid var(--am-border)',
              background: isKoperasi ? 'rgba(122,158,126,0.08)' : 'transparent',
            }}>
              <span style={{ fontSize: 16 }}>{isKoperasi ? '🏛' : '🏪'}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--am-text)' }}>{sellerName}</span>
              {isKoperasi && <span className="am-tag-koperasi">KOPERASI</span>}
            </div>

            {sellerItems.map(item => (
              <div key={item.product.id} style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                borderBottom: '1px solid var(--am-border)',
              }}>
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: 'var(--am-bg2)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--am-text)', lineHeight: 1.3, marginBottom: 4 }}>
                    {item.product.name}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--am-primary)', marginBottom: 8 }}>
                    {formatRupiah(item.product.price)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--am-border)', borderRadius: 8, overflow: 'hidden' }}>
                      <button
                        onClick={() => item.quantity === 1 ? onRemove(item.product.id) : onUpdateQty(item.product.id, item.quantity - 1)}
                        style={{ width: 32, height: 32, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 16, color: 'var(--am-text)' }}
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      <span style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--am-text)' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                        style={{ width: 32, height: 32, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 16, color: 'var(--am-text)' }}
                      >+</button>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-text)' }}>
                      {formatRupiah(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* PILIHAN METODE PENGIRIMAN / PENGAMBILAN */}
      <div className="am-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--am-text)' }}>📦 Pilih Metode Pengambilan</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          <div 
            onClick={() => handleMethodChange('delivery')}
            style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: deliveryMethod === 'delivery' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
              background: deliveryMethod === 'delivery' ? 'rgba(0,180,216,0.06)' : 'var(--am-bg2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🛵</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Kurir Antar Kampus</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Diantar langsung ke lokasi / kelas kamu</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-primary)' }}>{formatRupiah(5000)}</span>
          </div>

          <div 
            onClick={() => handleMethodChange('pickup')}
            style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: deliveryMethod === 'pickup' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
              background: deliveryMethod === 'pickup' ? 'rgba(0,180,216,0.06)' : 'var(--am-bg2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🏪</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Ambil Sendiri (Pick-Up)</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Ambil langsung ke tenant / koperasi</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>GRATIS</span>
          </div>

          <div 
            onClick={() => handleMethodChange('vending')}
            style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: deliveryMethod === 'vending' ? '2px solid var(--am-primary)' : '1.5px solid var(--am-border)',
              background: deliveryMethod === 'vending' ? 'rgba(0,180,216,0.06)' : 'var(--am-bg2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>Vending Machine (Khusus Ganci & Snack Kecil)</div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Ambil mandiri pakai kode QR / Token di mesin DIY</div>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>GRATIS</span>
          </div>

        </div>

        {/* Peringatan jika memilih vending tapi ada barang besar */}
        {hasInvalidVendingItems && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: '#EF4444', fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
            ⚠️ Perhatian: Vending Machine DIY hanya khusus untuk produk berukuran kecil seperti <b>Gantungan Kunci (Ganci)</b> atau <b>Makanan Kecil/Snack</b>. Hapus produk lain dari keranjang atau pilih metode Kurir Antar.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="am-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--am-text)' }}>Ringkasan Belanja</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)' }}>
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} produk)</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)' }}>
            <span>
              {deliveryMethod === 'delivery' && 'Ongkos kirim kurir kampus'}
              {deliveryMethod === 'pickup' && 'Biaya ambil sendiri'}
              {deliveryMethod === 'vending' && 'Biaya layanan vending machine'}
            </span>
            <span>{deliveryFee === 0 ? 'GRATIS' : formatRupiah(deliveryFee)}</span>
          </div>
          <hr className="am-divider" style={{ margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--am-primary)' }}>{formatRupiah(total)}</span>
          </div>
        </div>
      </div>

      {/* CTA (Tombol Checkout dikunci jika ada item terlarang di Vending Machine) */}
      <button 
        className="am-btn-primary" 
        style={{ 
          width: '100%', padding: '15px 0', fontSize: 16, 
          opacity: hasInvalidVendingItems ? 0.5 : 1, 
          cursor: hasInvalidVendingItems ? 'not-allowed' : 'pointer' 
        }} 
        onClick={() => {
          if (hasInvalidVendingItems) return
          onCheckout()
        }}
      >
        {hasInvalidVendingItems ? '⚠️ Periksa Kembali Jenis Produk Vending' : 'Lanjut ke Checkout →'}
      </button>
    </div>
  )
}