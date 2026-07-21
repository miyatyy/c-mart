import { useState, useEffect } from 'react'
import type { Product, CartItem, Campus, ThemeMode } from '../types'
import { CATEGORIES, formatRupiah } from '../data'

interface ProductListProps {
  theme: ThemeMode
  campus: Campus
  cartItems: CartItem[]
  onAddToCart: (product: Product, qty: number) => void
  onChat: (sellerId: string, sellerName: string, productName: string) => void
  onNavigateCheckout?: () => void
}

export default function ProductList({ theme, campus, cartItems, onAddToCart, onChat, onNavigateCheckout }: ProductListProps) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'koperasi' | 'mahasiswa'>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  
  const [successPopup, setSuccessPopup] = useState<{ product: Product; qty: number } | null>(null)
  const [productsList, setProductsList] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const isAesthetic = theme === 'aesthetic'

  const successModalStyles = `
    @keyframes bounceIn {
      0% { opacity: 0; transform: scale(0.8) translateY(20px); }
      70% { transform: scale(1.05) translateY(-5px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes checkAnim {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .success-modal-appear {
      animation: bounceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    .check-icon-anim {
      animation: checkAnim 0.4s ease-in-out 0.1s both;
    }
  `;

  useEffect(() => {
    const backendUrl = `http://${window.location.hostname}:3000/api/products`;

    fetch(backendUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.products) {
          const formattedProducts: Product[] = data.products.map((p: any) => ({
            id: String(p.id),
            name: p.nama_produk,
            description: p.deskripsi || '',
            price: p.harga,
            stock: p.stok,
            category: p.kategori,
            campus: (p.kampus || 'semua').toLowerCase().trim(),
            sellerId: p.sellerId || 'seller_1',
            sellerName: p.sellerName || 'Penjual Antasari',
            image: p.foto || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format',
            isKoperasi: p.isKoperasi || false,
            rating: p.rating || 5.0,
            sold: p.sold || 0,
          }))
          setProductsList(formattedProducts)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Gagal mengambil produk dari backend:", err)
        setLoading(false)
      })
  }, [campus])

  const products = productsList.filter(p => {
    const productCampus = (p.campus || 'semua').toLowerCase().trim();
    const activeCampus = (campus || 'banjarmasin').toLowerCase().trim();

    const matchCampus = productCampus === 'semua' || productCampus === 'all' || productCampus === activeCampus;
    if (!matchCampus) return false

    if (category !== 'all') {
      const prodCategory = (p.category || '').toLowerCase().trim();
      const filterCategory = category.toLowerCase().trim();
      if (!prodCategory.includes(filterCategory) && !filterCategory.includes(prodCategory)) {
        return false;
      }
    }

    if (filter === 'koperasi' && !p.isKoperasi) return false
    if (filter === 'mahasiswa' && p.isKoperasi) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false

    return true
  })

  const cartCount = (pid: string) => {
    const item = cartItems.find(i => i.product.id === pid)
    return item ? item.quantity : 0
  }

  function openProduct(p: Product) {
    setSelectedProduct(p)
    setQty(1)
  }

  // 👉 Handle Chat (Shopee Style: 1 Penjual 1 Room Utama ke Database)
  async function handleShopeeStyleChat(product: Product) {
    const currentUser = JSON.parse(localStorage.getItem('am_current_user') || '{"email": "miyya@gmail.com", "nama": "Miyatul"}');
    const sellerId = product.sellerId || 'seller_1';
    const sellerName = product.sellerName || 'Penjual Antasari';
    const buyerEmail = currentUser.email || 'miyya@gmail.com';
    const buyerName = currentUser.nama || currentUser.name || 'Miyatul';

    const initialMessage = `Halo Kak ${sellerName}, saya ingin bertanya mengenai produk "${product.name}" (${formatRupiah(product.price)}) apakah stoknya tersedia?`;

    try {
      // Kirim pesan otomatis ke backend PostgreSQL
      await fetch(`http://${window.location.hostname}:3000/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: `room_${sellerId}_${buyerEmail}`,
          sellerId,
          sellerName,
          buyerEmail,
          buyerName,
          senderId: buyerEmail,
          text: initialMessage
        })
      });
    } catch (error) {
      console.error("Gagal mengirim pesan awal chat:", error);
    }

    onChat(sellerId, sellerName, product.name);
  }

  return (
    <div style={{ padding: '0 0 80px', position: 'relative' }}>
      <style>{successModalStyles}</style>

      {/* Hero banner */}
      <div style={{
        background: isAesthetic
          ? 'linear-gradient(135deg, #C9B8D8 0%, #D4A5A5 50%, #7A9E7E 100%)'
          : 'linear-gradient(135deg, #0D1B2A 0%, #00B4D8 100%)',
        padding: '20px 16px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="am-heading" style={{
            color: 'white', margin: 0, fontSize: isAesthetic ? 24 : 22,
            fontWeight: isAesthetic ? 600 : 700, textShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}>
            {isAesthetic ? '✨ Selamat Datang!' : '⚡ Antasari Mart'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', margin: '4px 0 16px', fontSize: 13 }}>
            Dari Mahasiswa, Oleh Koperasi, Untuk Antasari
          </p>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
            <input
              className="am-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk, jasa, atau toko..."
              style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: 14, borderRadius: 999 }}
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all', label: 'Semua Toko' },
            { key: 'koperasi', label: '🏛 Koperasi' },
            { key: 'mahasiswa', label: '🎓 Mahasiswa Hub' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: '1.5px solid var(--am-border)', cursor: 'pointer',
                fontFamily: 'var(--am-font-body)',
                background: filter === f.key ? 'var(--am-primary)' : 'var(--am-surface)',
                color: filter === f.key ? 'white' : 'var(--am-text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="scroll-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: '1.5px solid var(--am-border)', cursor: 'pointer', flexShrink: 0,
                fontFamily: 'var(--am-font-body)',
                background: category === c.key ? 'var(--am-accent)' : 'var(--am-surface)',
                color: category === c.key ? (isAesthetic ? '#3D2B2B' : '#0D1B2A') : 'var(--am-text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 16px 8px', fontSize: 12, color: 'var(--am-text-muted)' }}>
        {loading ? 'Memuat produk...' : `${products.length} produk ditemukan di ${campus === 'banjarmasin' ? 'Banjarmasin' : 'Banjarbaru'}`}
      </div>

      {!loading && (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              theme={theme}
              inCart={cartCount(product.id)}
              onClick={() => openProduct(product)}
            />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Produk tidak ditemukan</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Coba ubah filter atau kategori</div>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedProduct(null) }}
        >
          <div className="am-card am-slide-up" style={{
            width: '100%', maxWidth: 540, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              style={{ width: '100%', height: 220, objectFit: 'cover', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
            />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h2 className="am-heading" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--am-text)' }}>
                  {selectedProduct.name}
                </h2>
                {selectedProduct.isKoperasi && <span className="am-tag-koperasi">KOPERASI</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--am-primary)' }}>
                  {formatRupiah(selectedProduct.price)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>⭐ {selectedProduct.rating} · {selectedProduct.sold} terjual</span>
              </div>

              <p style={{ fontSize: 14, color: 'var(--am-text-muted)', lineHeight: 1.6, margin: '12px 0' }}>
                {selectedProduct.description}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>🏪 Penjual: <strong style={{ color: 'var(--am-text)' }}>{selectedProduct.sellerName}</strong></span>
              </div>

              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: selectedProduct.stock > 5 ? 'rgba(74,197,108,0.12)' : selectedProduct.stock === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.12)',
                color: selectedProduct.stock > 5 ? '#16A34A' : selectedProduct.stock === 0 ? '#EF4444' : '#D97706',
                display: 'inline-block', marginBottom: 16,
              }}>
                {selectedProduct.stock === 0 ? '❌ Stok Habis' : `📦 Stok: ${selectedProduct.stock} tersisa`}
              </div>

              {selectedProduct.stock > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--am-text)' }}>Jumlah:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--am-border)', borderRadius: 8, overflow: 'hidden' }}>
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        style={{ width: 36, height: 36, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 18, color: 'var(--am-text)' }}
                      >−</button>
                      <span style={{ width: 40, textAlign: 'center', fontWeight: 700, color: 'var(--am-text)', fontSize: 15 }}>{qty}</span>
                      <button
                        onClick={() => setQty(q => Math.min(selectedProduct.stock, q + 1))}
                        style={{ width: 36, height: 36, border: 'none', background: 'var(--am-bg2)', cursor: 'pointer', fontSize: 18, color: 'var(--am-text)' }}
                      >+</button>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--am-text-muted)' }}>
                      = <strong style={{ color: 'var(--am-primary)' }}>{formatRupiah(selectedProduct.price * qty)}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() => {
                        handleShopeeStyleChat(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      style={{
                        padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--am-primary)',
                        background: 'var(--am-surface)', color: 'var(--am-primary)', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      💬 Tanya Penjual ({selectedProduct.sellerName})
                    </button>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          onAddToCart(selectedProduct, qty);
                          const currentProd = selectedProduct;
                          const currentQty = qty;
                          setSelectedProduct(null);
                          setSuccessPopup({ product: currentProd, qty: currentQty });
                        }}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: 10, border: '1.5px solid var(--am-border)',
                          background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 700,
                          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        🛒 Keranjang
                      </button>

                      <button
                        className="am-btn-primary"
                        onClick={() => {
                          onAddToCart(selectedProduct, qty);
                          setSelectedProduct(null);
                          if (onNavigateCheckout) onNavigateCheckout();
                        }}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
                          background: 'var(--am-primary)', color: 'white', fontWeight: 700,
                          fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        ⚡ Beli Sekarang
                      </button>
                    </div>
                  </div>
                </>
              )}

              {selectedProduct.stock === 0 && (
                <button
                  className="am-btn-outline"
                  style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
                  onClick={() => { handleShopeeStyleChat(selectedProduct); setSelectedProduct(null) }}
                >
                  💬 Tanya Kapan Restock ke {selectedProduct.sellerName}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {successPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="success-modal-appear am-card" style={{
            width: '100%', maxWidth: 360, padding: 28, borderRadius: 24,
            background: 'var(--am-surface)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div className="check-icon-anim" style={{
              width: 64, height: 64, margin: '0 auto 12px', background: 'rgba(74, 197, 108, 0.15)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#4AC56C', fontWeight: 'bold'
            }}>
              ✅
            </div>

            <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--am-text)' }}>
              Berhasil Masuk Keranjang! 🎉
            </h3>
            <p style={{ fontSize: 13, color: 'var(--am-text-muted)', marginBottom: 16 }}>
              Produk pilihanmu telah berhasil ditambahkan.
            </p>

            <div style={{
              padding: '12px 14px', background: 'var(--am-bg2)', borderRadius: 12,
              textAlign: 'left', marginBottom: 20, fontSize: 13, border: '1px solid var(--am-border)'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>{successPopup.product.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--am-text-muted)', fontSize: 12 }}>
                <span>Jumlah: <strong>{successPopup.qty} pcs</strong></span>
                <span style={{ fontWeight: 700, color: 'var(--am-primary)' }}>
                  {formatRupiah(successPopup.product.price * successPopup.qty)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setSuccessPopup(null)}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--am-border)',
                  background: 'var(--am-bg2)', color: 'var(--am-text)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Lanjut Belanja
              </button>
              <button
                className="am-btn-primary"
                onClick={() => {
                  setSuccessPopup(null);
                  if (onNavigateCheckout) onNavigateCheckout();
                }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                  background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                }}
              >
                Checkout Sekarang 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, theme, inCart, onClick }: { product: Product; theme: ThemeMode; inCart: number; onClick: () => void }) {
  const isAesthetic = theme === 'aesthetic'
  const isOutOfStock = product.stock === 0
  return (
    <div
      className="am-card"
      style={{ cursor: 'pointer', overflow: 'hidden', opacity: isOutOfStock ? 0.7 : 1, transition: 'transform 0.2s, box-shadow 0.2s' }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
    >
      <div style={{ position: 'relative', width: '100%', height: 160, background: 'var(--am-bg2)' }}>
        <img 
          src={product.image} 
          alt={product.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
        />
        {product.isKoperasi && (
          <span className="am-tag-koperasi" style={{ position: 'absolute', top: 8, left: 8 }}>KOPERASI</span>
        )}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 12, background: '#EF4444', padding: '4px 10px', borderRadius: 999 }}>HABIS</span>
          </div>
        )}
        {inCart > 0 && (
          <span style={{
            position: 'absolute', top: 8, right: 8, background: 'var(--am-primary)', color: 'white',
            borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 7px',
          }}>{inCart} di keranjang</span>
        )}
      </div>
      <div style={{ padding: isAesthetic ? '10px 10px 12px' : '8px 10px 10px' }}>
        <div style={{ fontSize: isAesthetic ? 13 : 12, fontWeight: 600, color: 'var(--am-text)', lineHeight: 1.3, marginBottom: 4 }}>
          {product.name}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--am-primary)' }}>
          {formatRupiah(product.price)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--am-text-muted)', marginTop: 3 }}>
          ⭐ {product.rating} · {product.sold} terjual · {product.sellerName}
        </div>
      </div>
    </div>
  )
}