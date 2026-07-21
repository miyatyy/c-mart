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
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const deliveryFee = 3000
  const total = subtotal + (items.length > 0 ? deliveryFee : 0)

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
            {/* Seller header */}
            <div style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: '1px solid var(--am-border)',
              background: isKoperasi ? 'rgba(122,158,126,0.08)' : 'transparent',
            }}>
              <span style={{ fontSize: 16 }}>{isKoperasi ? '🏛' : '🏪'}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--am-text)' }}>{sellerName}</span>
              {isKoperasi && <span className="am-tag-koperasi">KOPERASI</span>}
            </div>

            {/* Items */}
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
                    {/* Qty control */}
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

      {/* Summary */}
      <div className="am-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 className="am-heading" style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--am-text)' }}>Ringkasan Belanja</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)' }}>
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} produk)</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--am-text-muted)' }}>
            <span>Ongkos kirim kurir kampus</span>
            <span>{formatRupiah(deliveryFee)}</span>
          </div>
          <hr className="am-divider" style={{ margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--am-text)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--am-primary)' }}>{formatRupiah(total)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button className="am-btn-primary" style={{ width: '100%', padding: '15px 0', fontSize: 16 }} onClick={onCheckout}>
        Lanjut ke Checkout →
      </button>
    </div>
  )
}
