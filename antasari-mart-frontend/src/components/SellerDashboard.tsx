import { useState, useEffect } from 'react';
import type { ThemeMode, Campus, Product, ProductCategory, VerificationStatus, SellerVerificationData } from '../types';
import { MOCK_ORDERS, formatRupiah, CATEGORIES } from '../data';
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  uploadImageApi,
  generateProductDescriptionApi,
  sendChatApi,
  compressImageToTargetSize,
  validateAndProcessVideo,
  getVouchersApi,
  analyzeProductAiApi,
  evaluateProductSuitabilityLocally,
  getSellerVerificationStatusApi
} from '../lib/api';
import SellerCouponManager from './SellerCouponManager';
import SellerVerificationModal from './SellerVerificationModal';

interface SellerDashboardProps {
  theme: ThemeMode;
  campus: Campus;
  sellerId: string;
  sellerName: string;
}

type SellerTab = 'products' | 'orders' | 'analytics' | 'wallet' | 'promo';
type ProductTab = 'all' | 'active' | 'pending' | 'rejected' | 'empty';

interface NewProduct {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: ProductCategory;
  targetCampus: string;
}

const PRODUCT_IMAGE_PRESETS = [
  { name: 'Pentol Kuah UIN', category: 'makanan', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop' },
  { name: 'Ayam Geprek Sambal', category: 'makanan', url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=500&auto=format&fit=crop' },
  { name: 'Nasi Bakar Kampus', category: 'makanan', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop' },
  { name: 'Es Teh Manis Segar', category: 'minuman', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop' },
  { name: 'Kopi Susu Aren', category: 'minuman', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop' },
  { name: 'Boba Milk Tea', category: 'minuman', url: 'https://images.unsplash.com/photo-1558857563-b371f31ca957?w=500&auto=format&fit=crop' },
  { name: 'Ganci Rajut Cantik', category: 'aksesoris', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop' },
  { name: 'Blind Bag Suvenir', category: 'aksesoris', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&auto=format&fit=crop' },
  { name: 'Bunga Kawat Bulu', category: 'aksesoris', url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=500&auto=format&fit=crop' },
  { name: 'Keripik Pedas Renyah', category: 'snack', url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop' },
  { name: 'Kue Basah Tradisional', category: 'kue_banjar', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop' },
  { name: 'Jasa Print & Jilid', category: 'jasa', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500&auto=format&fit=crop' },
  { name: 'Kaos / Totebag Kampus', category: 'fashion', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop' },
];

export default function SellerDashboard({ theme: _theme, campus: _campus, sellerId, sellerName }: SellerDashboardProps) {
  const [tab, setTab] = useState<SellerTab>('products');
  const [productTab, setProductTab] = useState<ProductTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Store status
  const [isOpenStore, setIsOpenStore] = useState(true);

  // Store wallet / balance
  const [walletBalance, setWalletBalance] = useState(() => {
    return parseInt(localStorage.getItem(`am_seller_balance_${sellerId}`) || '450000');
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'dana' | 'gopay' | 'shopeepay' | 'bsi' | 'bca'>('dana');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  // Modals & State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editProdImages, setEditProdImages] = useState<string[]>([]);
  const [editProdVideo, setEditProdVideo] = useState<string>('');
  const [editProdVideoSize, setEditProdVideoSize] = useState<string>('');
  const [editProdVideoLoading, setEditProdVideoLoading] = useState<boolean>(false);

  const [isGeneratingAiDesc, setIsGeneratingAiDesc] = useState(false);
  const [isAiScanningProduct, setIsAiScanningProduct] = useState(false);
  const [selectedAiReport, setSelectedAiReport] = useState<Product | null>(null);
  const [alertPopup, setAlertPopup] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [photoMode, setPhotoMode] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customImageUrl, setCustomImageUrl] = useState('');

  // KTM Verification State
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_submitted');
  const [verificationData, setVerificationData] = useState<SellerVerificationData | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem(`am_seller_orders_${sellerId}`);
    return saved ? JSON.parse(saved) : MOCK_ORDERS;
  });

  const [newProd, setNewProd] = useState<NewProduct>({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'makanan',
    targetCampus: 'semua'
  });
  const [imageFile, setImageFile] = useState<string>('');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [newProdVideo, setNewProdVideo] = useState<string>('');
  const [newProdVideoSize, setNewProdVideoSize] = useState<string>('');

  const handleGenerateAiDescriptionForNew = async () => {
    if (!newProd.name || !newProd.name.trim()) {
      setAlertPopup({ message: '⚠️ Ketik nama produk terlebih dahulu!', type: 'error' });
      return;
    }
    setIsGeneratingAiDesc(true);
    try {
      const res = await generateProductDescriptionApi({
        name: newProd.name,
        category: newProd.category,
        price: newProd.price,
        sellerName
      });
      if (res && res.description) {
        setNewProd(prev => ({ ...prev, description: res.description }));
        setAlertPopup({ message: '✨ Deskripsi produk otomatis berhasil dibuat oleh AI DeepSeek!', type: 'success' });
      }
    } catch (_err) {
      setAlertPopup({ message: 'Gagal membuat deskripsi AI', type: 'error' });
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  const handleGenerateAiDescriptionForEdit = async () => {
    if (!editingProduct?.name) return;
    setIsGeneratingAiDesc(true);
    try {
      const res = await generateProductDescriptionApi({
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        sellerName
      });
      if (res && res.description) {
        setEditingProduct((prev: any) => ({ ...prev, description: res.description }));
        setAlertPopup({ message: '✨ Deskripsi produk berhasil diperbarui oleh AI DeepSeek!', type: 'success' });
      }
    } catch (_err) {
      setAlertPopup({ message: 'Gagal membuat deskripsi AI', type: 'error' });
    } finally {
      setIsGeneratingAiDesc(false);
    }
  };

  const loadProducts = () => {
    setLoading(true);
    getProductsApi(sellerId, 'all')
      .then(data => {
        if (data.success && data.products) {
          setProducts(data.products);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Gagal memuat produk seller:", err);
        setLoading(false);
      });
  };

  const loadVerificationStatus = async () => {
    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const email = sellerId || activeUser.email || '';
      if (email) {
        const res = await getSellerVerificationStatusApi(email);
        if (res && res.success && res.verification) {
          setVerificationData(res.verification);
          setVerificationStatus(res.verification.verificationStatus || 'not_submitted');
        }
      }
    } catch (err) {
      console.error("Gagal memuat status verifikasi seller:", err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadVerificationStatus();

    const handleModerationChange = () => {
      loadProducts();
    };
    const handleVerificationChange = () => {
      loadVerificationStatus();
    };

    window.addEventListener('am_product_moderated', handleModerationChange);
    window.addEventListener('am_product_submitted', handleModerationChange);
    window.addEventListener('am_seller_verification_updated', handleVerificationChange);

    return () => {
      window.removeEventListener('am_product_moderated', handleModerationChange);
      window.removeEventListener('am_product_submitted', handleModerationChange);
      window.removeEventListener('am_seller_verification_updated', handleVerificationChange);
    };
  }, [sellerId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const addedImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (newProdImages.length + addedImages.length >= 5) {
          setAlertPopup({ message: 'Maksimal 5 foto per produk!', type: 'error' });
          break;
        }
        const file = files[i];
        // Automatic client compression strictly guaranteeing <= 200KB
        const compressedBase64 = await compressImageToTargetSize(file, 200 * 1024);
        addedImages.push(compressedBase64);
      }

      if (addedImages.length > 0) {
        setNewProdImages(prev => [...prev, ...addedImages]);
        if (!imageFile) {
          setImageFile(addedImages[0]);
        }
        setAlertPopup({ message: `📸 ${addedImages.length} foto berhasil diproses & dikompresi (Maks 200 KB)!`, type: 'success' });
      }
    } catch (_err: any) {
      setAlertPopup({ message: 'Gagal memproses foto', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      const res = await validateAndProcessVideo(file, 5 * 1024 * 1024);
      if (!res.valid) {
        setAlertPopup({ message: `❌ ${res.error || 'Ukuran video melebihi 5 MB!'}`, type: 'error' });
      } else if (res.videoUrl) {
        setNewProdVideo(res.videoUrl);
        setNewProdVideoSize(res.sizeMb || '0');
        setAlertPopup({ message: `🎥 Video demo (${res.sizeMb} MB) berhasil diunggah!`, type: 'success' });
      }
    } catch (_err) {
      setAlertPopup({ message: 'Gagal memproses video', type: 'error' });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const addedImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        if (editProdImages.length + addedImages.length >= 5) {
          setAlertPopup({ message: 'Maksimal 5 foto per produk!', type: 'error' });
          break;
        }
        const file = files[i];
        const compressedBase64 = await compressImageToTargetSize(file, 200 * 1024);
        addedImages.push(compressedBase64);
      }

      if (addedImages.length > 0) {
        setEditProdImages(prev => [...prev, ...addedImages]);
        if (editingProduct && (!editingProduct.image || editingProduct.image === '')) {
          setEditingProduct((prev: any) => ({ ...prev, image: addedImages[0] }));
        }
        setAlertPopup({ message: `📸 ${addedImages.length} foto berhasil ditambahkan (Maks 200 KB)!`, type: 'success' });
      }
    } catch (_err: any) {
      setAlertPopup({ message: 'Gagal memproses foto edit', type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditProdVideoLoading(true);
    try {
      const res = await validateAndProcessVideo(file, 5 * 1024 * 1024);
      if (!res.valid) {
        setAlertPopup({ message: `❌ ${res.error || 'Ukuran video melebihi 5 MB!'}`, type: 'error' });
      } else if (res.videoUrl) {
        setEditProdVideo(res.videoUrl);
        setEditProdVideoSize(res.sizeMb || '0');
        setAlertPopup({ message: `🎥 Video demo (${res.sizeMb} MB) berhasil diperbarui!`, type: 'success' });
      }
    } catch (_err) {
      setAlertPopup({ message: 'Gagal memproses video edit', type: 'error' });
    } finally {
      setEditProdVideoLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || !newProd.price || !newProd.stock) {
      setAlertPopup({ message: 'Mohon lengkapi data produk wajib!', type: 'error' });
      return;
    }

    const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
    const finalImages = newProdImages.length > 0 ? newProdImages : (imageFile ? [imageFile] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format']);
    const finalMainImage = finalImages[0];

    setIsAiScanningProduct(true);
    try {
      // 🤖 1. Analisis Kelayakan & Keamanan Produk dengan AI
      const aiRes = await analyzeProductAiApi({
        name: newProd.name,
        description: newProd.description,
        price: parseInt(newProd.price),
        category: newProd.category,
        campus: newProd.targetCampus,
        sellerName: sellerName || activeUser.nama || 'Penjual Antasari'
      });

      // ⏳ 2. Simpan produk ke sistem dengan status 'pending' (tertahan untuk kurasi Super Admin)
      await createProductApi({
        name: newProd.name,
        description: newProd.description,
        price: parseInt(newProd.price),
        stock: parseInt(newProd.stock),
        category: newProd.category,
        image: finalMainImage,
        images: finalImages,
        videoUrl: newProdVideo || undefined,
        campus: newProd.targetCampus,
        sellerId: sellerId || activeUser.email || 'seller_1',
        sellerName: sellerName || activeUser.nama || 'Penjual Antasari',
        status: 'pending',
        aiAnalysis: aiRes.analysis
      });

      setShowAddModal(false);
      setNewProd({ name: '', description: '', price: '', stock: '', category: 'makanan', targetCampus: 'semua' });
      setImageFile('');
      setNewProdImages([]);
      setNewProdVideo('');
      setNewProdVideoSize('');
      loadProducts();

      setAlertPopup({
        message: `🛡️ Produk berhasil dianalisis AI (Skor: ${aiRes.analysis.score}%) & diajukan ke Super Admin! Status: Menunggu Kurasi sebelum tayang publik.`,
        type: 'success'
      });
    } catch (_err: any) {
      setAlertPopup({ message: 'Gagal mengajukan produk: ' + (_err.message || 'Terjadi kesalahan'), type: 'error' });
    } finally {
      setIsAiScanningProduct(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      const finalImages = editProdImages.length > 0 ? editProdImages : (editingProduct.image ? [editingProduct.image] : []);
      const finalMainImage = finalImages.length > 0 ? finalImages[0] : (editingProduct.image || '');

      const res = await updateProductApi(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description,
        price: parseInt(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        category: editingProduct.category,
        image: finalMainImage,
        images: finalImages,
        videoUrl: editProdVideo || undefined,
        userRole: activeUser.role,
        userEmail: activeUser.email
      });

      if (res.success) {
        setAlertPopup({ message: 'Perubahan produk multi-media berhasil disimpan di PostgreSQL! ✨', type: 'success' });
        setShowEditModal(false);
        setEditingProduct(null);
        setEditProdImages([]);
        setEditProdVideo('');
        loadProducts();
      } else {
        setAlertPopup({ message: res.message || 'Gagal memperbarui produk.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Gagal memperbarui produk: ' + err.message, type: 'error' });
    }
  };

  const handleQuickStockUpdate = async (productId: string | number, delta: number) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const newStock = Math.max(0, target.stock + delta);

    try {
      const activeUser = JSON.parse(localStorage.getItem('am_user_session') || '{}');
      await updateProductApi(productId, {
        stock: newStock,
        userRole: activeUser.role,
        userEmail: activeUser.email
      });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
      setAlertPopup({ message: `Stok "${target.name}" diperbarui jadi ${newStock} pcs! 📦`, type: 'success' });
    } catch {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
    }
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini dari katalog?')) return;
    try {
      const res = await deleteProductApi(id);
      if (res.success) {
        setAlertPopup({ message: 'Produk berhasil dihapus! 🗑️', type: 'success' });
        loadProducts();
      } else {
        setAlertPopup({ message: res.message || 'Gagal menghapus produk.', type: 'error' });
      }
    } catch (err: any) {
      setAlertPopup({ message: 'Gagal menghapus produk: ' + err.message, type: 'error' });
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem(`am_seller_orders_${sellerId}`, JSON.stringify(updated));
    setAlertPopup({ message: `Status Pesanan #${orderId} diubah menjadi "${newStatus}"! ✅`, type: 'success' });
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 10000) {
      setAlertPopup({ message: 'Minimal penarikan saldo adalah Rp 10.000', type: 'error' });
      return;
    }
    if (amount > walletBalance) {
      setAlertPopup({ message: 'Saldo tidak mencukupi untuk penarikan ini.', type: 'error' });
      return;
    }
    if (!withdrawAccount.trim()) {
      setAlertPopup({ message: 'Nomor e-wallet / rekening tujuan wajib diisi.', type: 'error' });
      return;
    }

    const newBalance = walletBalance - amount;
    setWalletBalance(newBalance);
    localStorage.setItem(`am_seller_balance_${sellerId}`, String(newBalance));
    setWithdrawSuccessMsg(`Penarikan ${formatRupiah(amount)} ke ${withdrawMethod.toUpperCase()} (${withdrawAccount}) berhasil diproses ke rekening Anda! 🎉`);
    setShowWithdrawModal(false);
    setWithdrawAmount('');
    setWithdrawAccount('');
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    let matchesTab = true;
    const status = p.status || 'approved';

    if (productTab === 'active') {
      matchesTab = (status === 'approved' || status === 'active') && p.stock > 0;
    } else if (productTab === 'pending') {
      matchesTab = status === 'pending';
    } else if (productTab === 'rejected') {
      matchesTab = status === 'rejected';
    } else if (productTab === 'empty') {
      matchesTab = p.stock <= 0;
    } // 'all' matches all

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    return matchesTab && matchesSearch && matchesCategory;
  });

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter === 'all') return true;
    return (o.status || '').toLowerCase().includes(orderStatusFilter.toLowerCase());
  });

  return (
    <div style={{ padding: '24px 16px 100px', maxWidth: 1200, margin: '0 auto', fontFamily: 'var(--am-font-body)' }}>
      {/* 🏪 STORE HERO BANNER & REAL-TIME STATS */}
      <div
        className="am-card"
        style={{
          padding: '24px 28px',
          borderRadius: 24,
          background: 'linear-gradient(135deg, #1B3826 0%, #2A543A 60%, #5FA874 100%)',
          color: 'white',
          marginBottom: 24,
          boxShadow: '0 8px 30px rgba(42, 84, 58, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1.5px solid rgba(255,255,255,0.3)' }}>
              🏪
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                  SELLER CENTRE RESMI
                </span>
                <span style={{ fontSize: 11, background: isOpenStore ? '#10B981' : '#EF4444', color: 'white', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                  {isOpenStore ? '🟢 Toko Buka' : '🔴 Toko Tutup'}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{sellerName}</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
                Tenant Kampus UIN Antasari • Rating Toko: ⭐ 4.9 (120 Ulasan) • Respon: 99%
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Toggle Buka/Tutup Toko */}
            <button
              onClick={() => {
                setIsOpenStore(prev => !prev);
                setAlertPopup({ message: isOpenStore ? 'Toko Anda ditutup sementara untuk pembeli.' : 'Toko Anda kini kembali buka dan menerima pesanan! 🟢', type: 'success' });
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                backdropFilter: 'blur(6px)'
              }}
            >
              {isOpenStore ? '⏸️ Tutup Sementara' : '▶️ Buka Toko'}
            </button>

            {/* Tambah Produk */}
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: '#FFFFFF',
                color: '#1B3826',
                fontWeight: 900,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>+</span> Tambah Produk Baru
            </button>
          </div>
        </div>

        {/* Quick Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Saldo Siap Ditarik</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{formatRupiah(walletBalance)}</span>
              <button
                onClick={() => setShowWithdrawModal(true)}
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#F59E0B', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                Tarik 🏧
              </button>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Total Produk Aktif</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{products.filter(p => p.stock > 0).length} Item</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Pesanan Perlu Diproses</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, color: '#FDE047' }}>{orders.length} Pesanan</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '10px 14px', borderRadius: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Omset Terjual Bulan Ini</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{formatRupiah(1850000)}</div>
          </div>
        </div>
      </div>

      {withdrawSuccessMsg && (
        <div style={{ marginBottom: 20, padding: '12px 18px', background: 'rgba(22, 163, 74, 0.1)', border: '1.5px solid #16A34A', borderRadius: 14, color: '#16A34A', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{withdrawSuccessMsg}</span>
          <button onClick={() => setWithdrawSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#16A34A', cursor: 'pointer', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* 🎓 KTM & ACTIVE STUDENT VERIFICATION BANNER */}
      <div style={{
        marginBottom: 22,
        padding: '16px 20px',
        borderRadius: 18,
        border: verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
          ? '1.5px solid #10B981'
          : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
            ? '1.5px solid #F59E0B'
            : verificationStatus === 'pending'
              ? '1.5px solid #F59E0B'
              : verificationStatus === 'rejected'
                ? '1.5px solid #EF4444'
                : '1.5px solid #6366F1',
        background: verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)'
          : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.04) 100%)'
            : verificationStatus === 'pending'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)'
              : verificationStatus === 'rejected'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.04) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 260 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
              ? '#10B981'
              : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                ? '#F59E0B'
                : verificationStatus === 'pending'
                  ? '#F59E0B'
                  : verificationStatus === 'rejected'
                    ? '#EF4444'
                    : '#6366F1',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0
          }}>
            {verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
              ? '✓'
              : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                ? '⚠️'
                : verificationStatus === 'pending'
                  ? '⏳'
                  : verificationStatus === 'rejected'
                    ? '✕'
                    : '🎓'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '3px 8px',
                borderRadius: 6,
                background: verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
                  ? '#10B981'
                  : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                    ? '#F59E0B'
                    : verificationStatus === 'pending'
                      ? '#F59E0B'
                      : verificationStatus === 'rejected'
                        ? '#EF4444'
                        : '#6366F1',
                color: 'white'
              }}>
                {verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
                  ? '✓ MAHASISWA AKTIF TERVERIFIKASI'
                  : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                    ? '⚠️ STATUS ALUMNI / NON-AKTIF'
                    : verificationStatus === 'pending'
                      ? '⏳ MENUNGGU PENINJAUAN KTM'
                      : verificationStatus === 'rejected'
                        ? '❌ VERIFIKASI KTM DITOLAK'
                        : '🎓 VERIFIKASI KTM DIPERLUKAN'}
              </span>

              {verificationData?.nim && (
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text-muted)' }}>
                  NIM: <span style={{ fontFamily: 'monospace', color: 'var(--am-text)' }}>{verificationData.nim}</span>
                </span>
              )}
            </div>

            <h4 style={{ margin: '2px 0', fontSize: 14, fontWeight: 800, color: 'var(--am-text)' }}>
              {verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
                ? 'Identitas Toko Mahasiswa Aktif Sah & Dilindungi'
                : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                  ? 'Masa Studi Telah Selesai (Status Alumni)'
                  : verificationStatus === 'pending'
                    ? 'Dokumen KTM Anda Sedang Diverifikasi Pengurus Koperasi'
                    : verificationStatus === 'rejected'
                      ? 'Verifikasi Ditolak: ' + (verificationData?.rejectionReason || 'Data tidak sesuai ketentuan')
                      : 'Verifikasi KTM Mahasiswa Aktif Anda Sekarang'}
            </h4>

            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--am-text-muted)', lineHeight: 1.45 }}>
              {verificationStatus === 'approved' && verificationData?.isActiveStudent !== false
                ? `Jenjang ${verificationData.degreeLevel || 'S1'} • Angkatan ${verificationData.entryYear || '-'} • Semester ${verificationData.currentSemester || '-'}. Produk Anda tampil di etalase publik dan berhak atas lencana penjual resmi kampus.`
                : verificationStatus === 'approved' && verificationData?.isActiveStudent === false
                  ? 'Sistem mendeteksi masa studi Anda telah melebihi batas ketentuan atau berstatus alumni. Produk Anda secara otomatis disembunyikan dari katalog belanja pembeli.'
                  : verificationStatus === 'pending'
                    ? 'Admin Koperasi UIN Antasari sedang mencocokkan identitas KTM dengan pangkalan data akademik. Estimasi proses 1x24 jam.'
                    : verificationStatus === 'rejected'
                      ? 'Silakan unggah ulang foto KTM asli yang jelas dan data akademik aktif yang valid agar toko Anda dapat diverifikasi kembali.'
                      : 'Unggah Kartu Tanda Mahasiswa (KTM) aktif untuk mendapatkan lencana resmi, membuka fitur katalog penuh, dan menjamin produk Anda tayang di etalase kampus.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowVerificationModal(true)}
            style={{
              padding: '9px 18px',
              borderRadius: 12,
              border: 'none',
              background: verificationStatus === 'approved'
                ? '#1B3826'
                : verificationStatus === 'pending'
                  ? '#D97706'
                  : verificationStatus === 'rejected'
                    ? '#DC2626'
                    : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              color: 'white',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <span>{verificationStatus === 'approved' ? '🔍 Lihat Data KTM' : verificationStatus === 'rejected' ? '🔄 Ajukan Ulang' : '🎓 Verifikasi KTM'}</span>
          </button>
        </div>
      </div>

      {/* 📑 TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--am-border)', paddingBottom: 10, overflowX: 'auto' }}>
        {[
          { id: 'products', label: '📦 Katalog Produk', badge: products.length },
          { id: 'orders', label: '📋 Pesanan Masuk', badge: orders.length },
          { id: 'analytics', label: '📊 Analitik & Finansial' },
          { id: 'wallet', label: '🏧 Dompet & Tarik Saldo' },
          { id: 'promo', label: '🏷️ Promo & Diskon Toko' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              background: tab === t.id ? 'var(--am-primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--am-text)',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {t.label}
            {t.badge !== undefined && (
              <span style={{
                background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'var(--am-bg2)',
                color: tab === t.id ? 'white' : 'var(--am-text-muted)',
                padding: '2px 7px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 800
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: KATALOG PRODUK ── */}
      {tab === 'products' && (
        <div>
          {/* 🛡️ BANNER INFORMASI MODERASI AI & SUPER ADMIN */}
          <div style={{
            padding: '14px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(95,168,116,0.12) 0%, rgba(16,185,129,0.08) 100%)',
            border: '1.5px solid rgba(95,168,116,0.3)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                🛡️
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--am-text)' }}>
                  Sistem Kurasi Otomatis AI & Verifikasi Super Admin
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', marginTop: 2 }}>
                  Setiap produk baru akan diperiksa standar keamanan, etika kampus UIN Antasari, dan harga wajar oleh AI sebelum disetujui Super Admin untuk tayang di publik.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="am-btn-primary"
              style={{ padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              + Tambah Produk Baru
            </button>
          </div>

          {/* Filter, Search & Sub Tabs */}
          <div className="am-card" style={{ padding: 16, borderRadius: 16, marginBottom: 18, background: 'var(--am-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              {/* Subtabs: Semua, Aktif, Menunggu Kurasi, Ditolak, Habis */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setProductTab('all')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: productTab === 'all' ? 'var(--am-primary)' : 'var(--am-bg2)',
                    color: productTab === 'all' ? 'white' : 'var(--am-text-muted)'
                  }}
                >
                  📦 Semua ({products.length})
                </button>
                <button
                  onClick={() => setProductTab('active')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: productTab === 'active' ? '#10B981' : 'var(--am-bg2)',
                    color: productTab === 'active' ? 'white' : 'var(--am-text-muted)'
                  }}
                >
                  🟢 Aktif / Tayang ({products.filter(p => (!p.status || p.status === 'approved' || p.status === 'active') && p.stock > 0).length})
                </button>
                <button
                  onClick={() => setProductTab('pending')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: productTab === 'pending' ? '#F59E0B' : 'var(--am-bg2)',
                    color: productTab === 'pending' ? 'white' : 'var(--am-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>⏳ Menunggu Review</span>
                  <span style={{ background: productTab === 'pending' ? 'rgba(255,255,255,0.3)' : 'rgba(245,158,11,0.2)', color: productTab === 'pending' ? 'white' : '#D97706', padding: '1px 6px', borderRadius: 6, fontSize: 10 }}>
                    {products.filter(p => p.status === 'pending').length}
                  </span>
                </button>
                <button
                  onClick={() => setProductTab('rejected')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: productTab === 'rejected' ? '#EF4444' : 'var(--am-bg2)',
                    color: productTab === 'rejected' ? 'white' : 'var(--am-text-muted)'
                  }}
                >
                  ❌ Ditolak ({products.filter(p => p.status === 'rejected').length})
                </button>
                <button
                  onClick={() => setProductTab('empty')}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: productTab === 'empty' ? '#6B7280' : 'var(--am-bg2)',
                    color: productTab === 'empty' ? 'white' : 'var(--am-text-muted)'
                  }}
                >
                  Stok Habis ({products.filter(p => p.stock <= 0).length})
                </button>
              </div>

              {/* Search & Category Filter */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  placeholder="Cari nama / deskripsi..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12,
                    outline: 'none',
                    minWidth: 160
                  }}
                />

                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--am-border)',
                    background: 'var(--am-bg2)',
                    color: 'var(--am-text)',
                    fontSize: 12,
                    outline: 'none'
                  }}
                >
                  <option value="all">Semua Kategori</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--am-text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p>Memuat katalog produk tokomu...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="am-card" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 20, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>Tidak Ada Produk Pada Tab Ini</h3>
              <p style={{ margin: '0 auto 18px', fontSize: 13, color: 'var(--am-text-muted)', maxWidth: 400 }}>
                {searchQuery || selectedCategoryFilter !== 'all'
                  ? 'Coba sesuaikan kata kunci pencarian atau filter kategori.'
                  : productTab === 'pending'
                    ? 'Tidak ada produk yang sedang menunggu kurasi Super Admin.'
                    : 'Yuk mulai tambahkan produk makanan, minuman, suvenir, atau merchandise kampus ke tokomu!'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="am-btn-primary"
                style={{ padding: '10px 24px', fontSize: 13, fontWeight: 800, borderRadius: 12 }}
              >
                + Tambah Produk Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {filteredProducts.map(p => {
                const prodStatus = p.status || 'approved';
                const aiScore = p.aiAnalysis?.score || 90;

                return (
                  <div
                    key={p.id}
                    className="am-card"
                    style={{
                      borderRadius: 18,
                      background: 'var(--am-surface)',
                      overflow: 'hidden',
                      border: prodStatus === 'pending' ? '1.5px solid #F59E0B' : prodStatus === 'rejected' ? '1.5px solid #EF4444' : '1px solid var(--am-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <div style={{ position: 'relative', height: 160, background: 'var(--am-bg2)' }}>
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      
                      {/* Stock Pill */}
                      <span style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: p.stock > 5 ? 'rgba(16, 185, 129, 0.95)' : p.stock > 0 ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.95)',
                        color: 'white',
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backdropFilter: 'blur(4px)'
                      }}>
                        {p.stock > 0 ? `Stok: ${p.stock}` : 'Habis'}
                      </span>

                      {/* Category Pill */}
                      <span style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.65)',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        textTransform: 'capitalize'
                      }}>
                        {p.category}
                      </span>
                    </div>

                    <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* STATUS MODERASI BADGE */}
                      {prodStatus === 'pending' && (
                        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>⏳ Menunggu Kurasi Admin</span>
                          <span style={{ background: '#F59E0B', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                            AI: {aiScore}%
                          </span>
                        </div>
                      )}

                      {prodStatus === 'rejected' && (
                        <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', color: '#991B1B', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>❌ Ditolak Super Admin</span>
                            <span style={{ fontSize: 10, background: '#EF4444', color: 'white', padding: '1px 5px', borderRadius: 4 }}>AI: {aiScore}%</span>
                          </div>
                          {p.moderationReason && (
                            <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 3, color: '#B91C1C' }}>
                              Alasan: {p.moderationReason}
                            </div>
                          )}
                        </div>
                      )}

                      {(prodStatus === 'approved' || prodStatus === 'active') && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', color: '#065F46', padding: '4px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>✅ Aktif di Etalase Publik</span>
                          {p.aiAnalysis && <span>• Skor AI: {p.aiAnalysis.score}%</span>}
                        </div>
                      )}

                      <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: 'var(--am-text)', lineHeight: 1.3 }}>
                        {p.name}
                      </h4>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--am-primary)', marginBottom: 6 }}>
                        {formatRupiah(p.price)}
                      </div>
                      {p.description && (
                        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--am-text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.description}
                        </p>
                      )}

                      {/* TOMBOL LAPORAN ANALISIS AI */}
                      <button
                        onClick={() => setSelectedAiReport(p)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: '1px dashed var(--am-primary)',
                          background: 'rgba(95,168,116,0.06)',
                          color: 'var(--am-primary)',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          marginBottom: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <span>🤖</span> Detail Analisis AI {p.aiAnalysis ? `(${p.aiAnalysis.score}%)` : ''}
                      </button>

                      {/* Quick Inline Stock Stepper */}
                      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--am-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 700 }}>Ubah Stok Cepat:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleQuickStockUpdate(p.id, -1)}
                            disabled={p.stock <= 0}
                            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', cursor: p.stock <= 0 ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 14 }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: 13, fontWeight: 800, minWidth: 28, textAlign: 'center' }}>
                            {p.stock}
                          </span>
                          <button
                            onClick={() => handleQuickStockUpdate(p.id, 5)}
                            style={{ padding: '0 8px', height: 28, borderRadius: 6, border: '1px solid var(--am-border)', background: 'var(--am-bg2)', cursor: 'pointer', fontWeight: 800, fontSize: 11 }}
                            title="Tambah +5 stok"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            const existingImgs = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
                            setEditProdImages(existingImgs);
                            setEditProdVideo(p.videoUrl || '');
                            setEditProdVideoSize('');
                            setShowEditModal(true);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 10,
                            border: '1.5px solid var(--am-primary)',
                            background: 'var(--am-primary-light, rgba(95,168,116,0.12))',
                            color: 'var(--am-primary)',
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit Detail
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            fontSize: 13,
                            cursor: 'pointer',
                            fontWeight: 800
                          }}
                          title="Hapus Produk"
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
      )}

      {/* ── TAB 2: PESANAN MASUK ── */}
      {tab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filter Status Pesanan */}
          <div className="am-card" style={{ padding: 14, borderRadius: 16, background: 'var(--am-surface)', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {[
              { id: 'all', label: 'Semua Pesanan' },
              { id: 'menunggu', label: '⏳ Menunggu Konfirmasi' },
              { id: 'diproses', label: '🍳 Sedang Disiapkan' },
              { id: 'dikirim', label: '🛵 Sedang Diantar / Siap Ambil' },
              { id: 'selesai', label: '✅ Selesai' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setOrderStatusFilter(s.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: orderStatusFilter === s.id ? 'var(--am-primary)' : 'var(--am-bg2)',
                  color: orderStatusFilter === s.id ? 'white' : 'var(--am-text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* List Pesanan */}
          {filteredOrders.length === 0 ? (
            <div className="am-card" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: 20, background: 'var(--am-surface)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>Belum Ada Pesanan Masuk</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--am-text-muted)' }}>
                Pesanan baru dari mahasiswa atau pembeli akan langsung muncul di sini secara real-time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredOrders.map(ord => (
                <div
                  key={ord.id}
                  className="am-card"
                  style={{
                    padding: 20,
                    borderRadius: 18,
                    background: 'var(--am-surface)',
                    border: '1px solid var(--am-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--am-border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--am-text)' }}>Order #{ord.id}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: ord.status?.includes('Selesai') ? '#DCFCE7' : '#FEF3C7',
                          color: ord.status?.includes('Selesai') ? '#16A34A' : '#D97706'
                        }}>
                          {ord.status || 'Menunggu Diproses'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 4 }}>
                        Pembeli: <strong>{ord.buyerName}</strong> • {ord.deliveryMethod === 'delivery' ? '🛵 Kurir Antar' : '🏪 Ambil Sendiri'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>Total Pembayaran</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--am-primary)' }}>
                        {formatRupiah(ord.total || 35000)}
                      </div>
                    </div>
                  </div>

                  {/* Items in order */}
                  <div style={{ background: 'var(--am-bg2)', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: 'var(--am-text)', marginBottom: 4 }}>Rincian Item:</div>
                    <div style={{ color: 'var(--am-text-muted)' }}>
                      • 1x Menu Pilihan Favorit Kampus ({formatRupiah(ord.total || 35000)})
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        sendChatApi({
                          fromId: sellerId,
                          fromName: sellerName,
                          fromRole: 'seller',
                          toId: ord.buyerEmail || 'pembeli@antasari.mart',
                          toName: ord.buyerName,
                          toRole: 'buyer',
                          text: `Halo Kak ${ord.buyerName}, pesanan #${ord.id} sedang kami siapkan ya!`
                        });
                        setAlertPopup({ message: `Pesan chat terkirim ke Kak ${ord.buyerName}! 💬`, type: 'success' });
                      }}
                      style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      💬 Chat Pembeli
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, '🍳 Sedang Disiapkan')}
                      style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#F59E0B', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🍳 Siapkan Pesanan
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, '🛵 Siap Diantar / Diambil')}
                      style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#3B82F6', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🛵 Siap Kirim
                    </button>
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, '✅ Pesanan Selesai')}
                      style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#16A34A', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✅ Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: ANALITIK & FINANSIAL ── */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 3 Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(95, 168, 116, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  💰
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Omset Kotor</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--am-primary)', marginTop: 2 }}>{formatRupiah(2450000)}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#16A34A', fontWeight: 700 }}>
                ↑ +18.4% dari bulan lalu
              </div>
            </div>

            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  📦
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Total Produk Terjual</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#3B82F6', marginTop: 2 }}>148 Pcs</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>
                Rata-rata 12 transaksi / hari
              </div>
            </div>

            <div className="am-card" style={{ padding: 22, borderRadius: 18, background: 'var(--am-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  ⭐
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>Skor Kepuasan Pembeli</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B', marginTop: 2 }}>4.9 / 5.0</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>
                100% Pesanan Tepat Waktu
              </div>
            </div>
          </div>

          {/* Detailed Analytics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {/* Top Products */}
            <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)' }}>
              <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--am-text)' }}>
                🏆 5 Produk Terlaris Toko
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {products.slice(0, 5).map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--am-bg2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--am-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{formatRupiah(p.price)}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-primary)' }}>
                      {p.sold || 24} terjual
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jam Ramai Penjualan */}
            <div className="am-card" style={{ padding: 20, borderRadius: 18, background: 'var(--am-surface)' }}>
              <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--am-text)' }}>
                ⏰ Jam Paling Ramai Pesanan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { time: '11:30 - 13:30 (Istirahat Dzuhur & Makan Siang)', pct: 45, label: 'Sangat Padat 🔥' },
                  { time: '15:30 - 17:00 (Selesai Kelas Sore)', pct: 30, label: 'Ramai ✨' },
                  { time: '08:30 - 10:00 (Sarapan Pagi)', pct: 18, label: 'Sedang' },
                  { time: 'Waktu Lainnya', pct: 7, label: 'Normal' },
                ].map((slot, idx) => (
                  <div key={idx} style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--am-text)' }}>{slot.time}</span>
                      <span style={{ fontWeight: 800, color: 'var(--am-primary)' }}>{slot.pct}% ({slot.label})</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--am-bg2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${slot.pct}%`, background: 'var(--am-primary)', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: DOMPET & TARIK SALDO ── */}
      {tab === 'wallet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Card Saldo & Penarikan */}
          <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 17, color: 'var(--am-text)' }}>
              🏧 Dompet Penghasilan Toko
            </h3>

            <div style={{ padding: 20, borderRadius: 16, background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)', color: 'white', marginBottom: 18 }}>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Saldo Toko Tersedia</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{formatRupiah(walletBalance)}</div>
              <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>
                Bebas biaya admin transfer ke BSI, DANA, GoPay & ShopeePay
              </div>
            </div>

            <button
              onClick={() => setShowWithdrawModal(true)}
              className="am-btn-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 800, borderRadius: 12 }}
            >
              🏧 Tarik Saldo ke Rekening / E-Wallet
            </button>
          </div>

          {/* Riwayat Penarikan Dana */}
          <div className="am-card" style={{ padding: 24, borderRadius: 20, background: 'var(--am-surface)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 17, color: 'var(--am-text)' }}>
              📜 Riwayat Penarikan Saldo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { date: 'Hari ini, 10:15', method: 'DANA (0812****001)', amount: 150000, status: 'Berhasil ✅' },
                { date: '28 Agu 2026', method: 'BSI (7140****99)', amount: 300000, status: 'Berhasil ✅' },
                { date: '20 Agu 2026', method: 'ShopeePay (0812****001)', amount: 200000, status: 'Berhasil ✅' },
              ].map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--am-bg2)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--am-text)' }}>{h.method}</div>
                    <div style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>{h.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--am-text)' }}>- {formatRupiah(h.amount)}</div>
                    <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>{h.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: PROMO & DISKON TOKO ── */}
      {tab === 'promo' && (
        <SellerCouponManager
          sellerId={sellerId}
          sellerName={sellerName}
          theme={_theme}
          products={products}
          onNotify={(message, type) => setAlertPopup({ message, type })}
        />
      )}

      {/* ── MODAL TARIK SALDO ── */}
      {showWithdrawModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 460, padding: 24, borderRadius: 22, background: 'var(--am-surface)' }}>
            <h3 className="am-heading" style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--am-text)' }}>
              🏧 Tarik Saldo Toko
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--am-text-muted)' }}>
              Saldo saat ini: <strong style={{ color: 'var(--am-primary)' }}>{formatRupiah(walletBalance)}</strong>
            </p>

            <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Pilih Rekening / E-Wallet Tujuan</label>
                <select
                  value={withdrawMethod}
                  onChange={e => setWithdrawMethod(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, fontWeight: 700 }}
                >
                  <option value="dana">DANA (Bebas Biaya Admin)</option>
                  <option value="gopay">GoPay</option>
                  <option value="shopeepay">ShopeePay</option>
                  <option value="bsi">Bank Syariah Indonesia (BSI)</option>
                  <option value="bca">Bank BCA</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nomor HP / Nomor Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081234567890"
                  value={withdrawAccount}
                  onChange={e => setWithdrawAccount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nominal Penarikan (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Minimal 10000"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, background: 'var(--am-bg2)', color: 'var(--am-text)', fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="am-btn-primary"
                  style={{ flex: 1, padding: '11px', borderRadius: 12, fontWeight: 800, fontSize: 13 }}
                >
                  Konfirmasi Tarik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH PRODUK ── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 500, padding: 24, borderRadius: 22, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--am-text)' }}>
              Tambah Produk Baru ke Lapak
            </h3>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pentol Kuah UIN / Ganci Myammiy"
                  value={newProd.name}
                  onChange={e => setNewProd({ ...newProd, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={newProd.price}
                    onChange={e => setNewProd({ ...newProd, price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Stok Awal</label>
                  <input
                    type="number"
                    required
                    placeholder="20"
                    value={newProd.stock}
                    onChange={e => setNewProd({ ...newProd, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Kategori Produk</label>
                <select
                  value={newProd.category}
                  onChange={e => setNewProd({ ...newProd, category: e.target.value as ProductCategory })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              {/* MULTI-FOTO PRODUK (MAKS 200 KB PER FOTO) */}
              <div style={{ background: 'var(--am-bg2)', padding: 14, borderRadius: 14, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    📸 Multi-Foto Etalase ({newProdImages.length}/5 Foto)
                  </label>
                  <span style={{ fontSize: 10.5, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                    Maks 200 KB/Foto
                  </span>
                </div>

                {/* Previews of uploaded images */}
                {newProdImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {newProdImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', border: idx === 0 ? '2px solid var(--am-primary)' : '1px solid var(--am-border)' }}>
                        <img src={img} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'var(--am-primary)', color: 'white', fontSize: 8, fontWeight: 900, padding: '1px 4px', borderRadius: 4 }}>
                            Utama
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setNewProdImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: photoMode === 'upload' ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                      background: photoMode === 'upload' ? 'var(--am-primary-light, rgba(95,168,116,0.15))' : 'var(--am-surface)',
                      color: photoMode === 'upload' ? 'var(--am-primary)' : 'var(--am-text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📁 Galeri HP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('preset')}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: photoMode === 'preset' ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                      background: photoMode === 'preset' ? 'var(--am-primary-light, rgba(95,168,116,0.15))' : 'var(--am-surface)',
                      color: photoMode === 'preset' ? 'var(--am-primary)' : 'var(--am-text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🎨 Template Cepat
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('url')}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: photoMode === 'url' ? '1.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                      background: photoMode === 'url' ? 'var(--am-primary-light, rgba(95,168,116,0.15))' : 'var(--am-surface)',
                      color: photoMode === 'url' ? 'var(--am-primary)' : 'var(--am-text-muted)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🔗 Link / URL
                  </button>
                </div>

                {photoMode === 'upload' && (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '14px',
                      borderRadius: 10,
                      border: '2px dashed var(--am-primary)',
                      background: 'var(--am-surface)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: 24 }}>📸</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-primary)' }}>
                      {uploadingImage ? 'Sedang Memproses Foto (Auto Compress <=200KB)...' : '+ Tambah Foto dari Galeri (Bisa Pilih Banyak)'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>Maks 5 foto • Otomatis dikompresi di bawah 200 KB</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}

                {photoMode === 'preset' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    maxHeight: 120,
                    overflowY: 'auto',
                    padding: 4,
                    background: 'var(--am-surface)',
                    borderRadius: 8,
                    border: '1px solid var(--am-border)'
                  }}>
                    {PRODUCT_IMAGE_PRESETS.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setNewProdImages(prev => prev.length < 5 ? [...prev, p.url] : prev);
                          if (!imageFile) setImageFile(p.url);
                          setAlertPopup({ message: `Foto "${p.name}" ditambahkan! 📸`, type: 'success' });
                        }}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 8,
                          overflow: 'hidden',
                          position: 'relative',
                          border: newProdImages.includes(p.url) ? '2.5px solid var(--am-primary)' : '1px solid var(--am-border)',
                          aspectRatio: '1'
                        }}
                      >
                        <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}

                {photoMode === 'url' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={customImageUrl}
                      onChange={e => setCustomImageUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--am-border)',
                        background: 'var(--am-surface)',
                        color: 'var(--am-text)',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customImageUrl.trim() && newProdImages.length < 5) {
                          setNewProdImages(prev => [...prev, customImageUrl.trim()]);
                          if (!imageFile) setImageFile(customImageUrl.trim());
                          setCustomImageUrl('');
                        }
                      }}
                      style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'var(--am-primary)', color: 'white', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}
                    >
                      + Tambah
                    </button>
                  </div>
                )}
              </div>

              {/* VIDEO DEMO PRODUK (MAKS 5 MB) */}
              <div style={{ background: 'var(--am-bg2)', padding: 14, borderRadius: 14, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    🎥 Video Demo Produk (Opsional)
                  </label>
                  <span style={{ fontSize: 10.5, color: '#3B82F6', background: '#DBEAFE', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                    Maks 5 MB
                  </span>
                </div>

                {newProdVideo ? (
                  <div>
                    <video
                      src={newProdVideo}
                      controls
                      style={{ width: '100%', maxHeight: 180, borderRadius: 10, background: '#000', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 700 }}>
                        ✓ Video terpasang {newProdVideoSize ? `(${newProdVideoSize} MB)` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setNewProdVideo(''); setNewProdVideoSize(''); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Hapus Video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '12px',
                        borderRadius: 10,
                        border: '2px dashed #3B82F6',
                        background: 'var(--am-surface)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginBottom: 8
                      }}
                    >
                      <span style={{ fontSize: 22 }}>🎬</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6' }}>
                        {uploadingVideo ? 'Memvalidasi Ukuran Video...' : 'Unggah Video Demo (MP4 / WebM)'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--am-text-muted)' }}>Maksimal ukuran file video adalah 5 MB</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleVideoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Atau tempel Link URL Video (https://...mp4)"
                      value={newProdVideo}
                      onChange={e => setNewProdVideo(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 11.5, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Deskripsi Produk</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescriptionForNew}
                    disabled={isGeneratingAiDesc || !newProd.name}
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #C084FC 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: newProd.name ? 'pointer' : 'not-allowed',
                      opacity: newProd.name ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {isGeneratingAiDesc ? '⏳ Menulis...' : '✨ Buat AI DeepSeek'}
                  </button>
                </div>
                <textarea
                  placeholder="Jelaskan bahan, rasa, keunggulan, atau klik '✨ Buat AI DeepSeek'..."
                  value={newProd.description}
                  onChange={e => setNewProd({ ...newProd, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', boxSizing: 'border-box', height: 80, fontSize: 12.5, background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isAiScanningProduct}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAiScanningProduct}
                  className="am-btn-primary"
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: isAiScanningProduct ? 0.7 : 1,
                    cursor: isAiScanningProduct ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isAiScanningProduct ? '🤖 AI Sedang Menguji Kelayakan...' : '🛡️ Ajukan & Uji Kelayakan AI 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT PRODUK ── */}
      {showEditModal && editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 500, padding: 24, borderRadius: 22, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="am-heading" style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--am-text)' }}>
              Edit Detail Produk Multi-Media
            </h3>

            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Harga (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Stok</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', marginTop: 4, boxSizing: 'border-box', background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                  />
                </div>
              </div>

              {/* EDIT MULTI-FOTO PRODUK (MAKS 200 KB) */}
              <div style={{ background: 'var(--am-bg2)', padding: 14, borderRadius: 14, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    📸 Multi-Foto Produk ({editProdImages.length}/5 Foto)
                  </label>
                  <span style={{ fontSize: 10.5, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                    Maks 200 KB/Foto
                  </span>
                </div>

                {editProdImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {editProdImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', border: idx === 0 ? '2px solid var(--am-primary)' : '1px solid var(--am-border)' }}>
                        <img src={img} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {idx === 0 && (
                          <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'var(--am-primary)', color: 'white', fontSize: 8, fontWeight: 900, padding: '1px 4px', borderRadius: 4 }}>
                            Utama
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditProdImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '12px',
                    borderRadius: 10,
                    border: '2px dashed var(--am-primary)',
                    background: 'var(--am-surface)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: 20 }}>📸</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--am-primary)' }}>
                    + Tambah / Ganti Foto dari Galeri (Auto Compress &lt;=200KB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* EDIT VIDEO DEMO PRODUK (MAKS 5 MB) */}
              <div style={{ background: 'var(--am-bg2)', padding: 14, borderRadius: 14, border: '1px solid var(--am-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)' }}>
                    🎥 Video Demo Produk (Opsional)
                  </label>
                  <span style={{ fontSize: 10.5, color: '#3B82F6', background: '#DBEAFE', padding: '2px 8px', borderRadius: 6, fontWeight: 800 }}>
                    Maks 5 MB
                  </span>
                </div>

                {editProdVideo ? (
                  <div>
                    <video
                      src={editProdVideo}
                      controls
                      style={{ width: '100%', maxHeight: 180, borderRadius: 10, background: '#000', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--am-text-muted)', fontWeight: 700 }}>
                        ✓ Video demo aktif {editProdVideoSize ? `(${editProdVideoSize} MB)` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditProdVideo(''); setEditProdVideoSize(''); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Hapus Video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '12px',
                        borderRadius: 10,
                        border: '2px dashed #3B82F6',
                        background: 'var(--am-surface)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        marginBottom: 8
                      }}
                    >
                      <span style={{ fontSize: 20 }}>🎥</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#3B82F6' }}>
                        {editProdVideoLoading ? 'Sedang Memeriksa Ukuran Video...' : '+ Unggah Video Demo (Maks 5 MB)'}
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleEditVideoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Atau tempel Link URL Video (https://...mp4)"
                      value={editProdVideo}
                      onChange={e => setEditProdVideo(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--am-border)', background: 'var(--am-surface)', color: 'var(--am-text)', fontSize: 11.5, boxSizing: 'border-box' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--am-text-muted)' }}>Deskripsi</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiDescriptionForEdit}
                    disabled={isGeneratingAiDesc || !editingProduct.name}
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #C084FC 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: editingProduct.name ? 'pointer' : 'not-allowed',
                      opacity: editingProduct.name ? 1 : 0.6
                    }}
                  >
                    {isGeneratingAiDesc ? '⏳ Menulis...' : '✨ Perbarui AI'}
                  </button>
                </div>
                <textarea
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid var(--am-border)', boxSizing: 'border-box', height: 80, fontSize: 12.5, background: 'var(--am-bg2)', color: 'var(--am-text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--am-border)', background: 'var(--am-surface)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="am-btn-primary"
                  style={{ flex: 1, padding: '11px', borderRadius: 12, fontWeight: 800, fontSize: 13 }}
                >
                  Simpan Perubahan ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 🤖 MODAL LAPORAN ANALISIS AI PRODUK ── */}
      {selectedAiReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="am-card" style={{ width: '100%', maxWidth: 540, padding: 24, borderRadius: 24, background: 'var(--am-surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '1px solid var(--am-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  🤖
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--am-text)' }}>
                    Laporan Audit & Analisis AI
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--am-text-muted)' }}>
                    Pemeriksaan Otomatis Keamanan & Etika Kampus UIN Antasari
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAiReport(null)}
                style={{ background: 'var(--am-bg2)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontWeight: 800, color: 'var(--am-text)' }}
              >
                ✕
              </button>
            </div>

            {/* Product Snapshot */}
            <div style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--am-bg2)', borderRadius: 14, marginBottom: 16 }}>
              <img src={selectedAiReport.image} alt={selectedAiReport.name} style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: 'var(--am-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedAiReport.name}
                </h4>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--am-primary)' }}>
                  {formatRupiah(selectedAiReport.price)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>
                  Kategori: <strong style={{ textTransform: 'capitalize' }}>{selectedAiReport.category}</strong> • Kampus: {selectedAiReport.campus}
                </div>
              </div>
            </div>

            {/* Score & Verdict Box */}
            {(() => {
              const analysis = selectedAiReport.aiAnalysis || evaluateProductSuitabilityLocally({
                name: selectedAiReport.name,
                description: selectedAiReport.description,
                price: selectedAiReport.price,
                category: selectedAiReport.category,
                campus: selectedAiReport.campus,
                sellerName: selectedAiReport.sellerName
              });
              const score = analysis.score;
              const isHigh = score >= 85;
              const isMed = score >= 60 && score < 85;
              const scoreColor = isHigh ? '#10B981' : isMed ? '#F59E0B' : '#EF4444';

              return (
                <div>
                  {/* Gauge Card */}
                  <div style={{
                    padding: 16,
                    borderRadius: 16,
                    background: isHigh ? 'rgba(16,185,129,0.08)' : isMed ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1.5px solid ${scoreColor}`,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div style={{
                      width: 68,
                      height: 68,
                      borderRadius: '50%',
                      border: `4px solid ${scoreColor}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: 'var(--am-surface)'
                    }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{score}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--am-text-muted)' }}>/ 100</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', background: scoreColor, color: 'white', padding: '2px 8px', borderRadius: 6 }}>
                          {isHigh ? 'Sangat Layak' : isMed ? 'Perlu Tinjauan' : 'Tidak Layak'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--am-text-muted)' }}>
                          Model: {analysis.model || 'Antasari-AI Engine'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--am-text)' }}>
                        {analysis.verdict}
                      </div>
                    </div>
                  </div>

                  {/* Checklist 4 Pilar Standar Antasari Mart */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--am-text)', marginBottom: 8 }}>
                      📋 Checklist 4 Pilar Kelayakan Kampus:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Keamanan & Legalitas', status: analysis.checks?.safety || 'PASS' },
                        { label: 'Etika Syariah UIN', status: analysis.checks?.campusEthics || 'PASS' },
                        { label: 'Kewajaran Harga', status: analysis.checks?.fairPricing || 'PASS' },
                        { label: 'Kelengkapan Info', status: analysis.checks?.mediaQuality || 'PASS' }
                      ].map((chk, i) => (
                        <div key={i} style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--am-bg2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11.5, color: 'var(--am-text)' }}>{chk.label}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: chk.status === 'PASS' ? '#DCFCE7' : chk.status === 'FLAGGED' ? '#FEF3C7' : '#FEE2E2',
                            color: chk.status === 'PASS' ? '#166534' : chk.status === 'FLAGGED' ? '#92400E' : '#991B1B'
                          }}>
                            {chk.status === 'PASS' ? '✓ PASS' : chk.status === 'FLAGGED' ? '⚠️ PERINGATAN' : '✕ GAGAL'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reasons / Positives */}
                  {analysis.reasons && analysis.reasons.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#16A34A', marginBottom: 6 }}>
                        ✨ Poin Positif Terdeteksi:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--am-text)', lineHeight: 1.5 }}>
                        {analysis.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Flags / Notes */}
                  {analysis.flags && analysis.flags.length > 0 && (
                    <div style={{ marginBottom: 14, padding: 10, background: '#FEF3C7', borderRadius: 10, border: '1px solid #F59E0B' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>
                        ⚠️ Catatan Perbaikan:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: '#78350F', lineHeight: 1.4 }}>
                        {analysis.flags.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Moderation Status Note */}
                  <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--am-bg2)', border: '1px solid var(--am-border)', marginTop: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--am-text-muted)', marginBottom: 2 }}>
                      STATUS KURASI SUPER ADMIN:
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: selectedAiReport.status === 'pending' ? '#D97706' : selectedAiReport.status === 'rejected' ? '#DC2626' : '#16A34A' }}>
                      {selectedAiReport.status === 'pending'
                        ? '⏳ Sedang dalam antrean kurasi Super Admin. Produk akan otomatis tampil di etalase pembeli setelah disetujui.'
                        : selectedAiReport.status === 'rejected'
                          ? `❌ Produk ditolak oleh Super Admin (${selectedAiReport.moderationReason || 'Tidak memenuhi kriteria'})`
                          : '✅ Produk telah disetujui dan saat ini aktif di etalase publik Campus Mart!'}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setSelectedAiReport(null)}
                className="am-btn-primary"
                style={{ width: '100%', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 800 }}
              >
                Tutup Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎓 KTM Seller Verification Modal */}
      {showVerificationModal && (
        <SellerVerificationModal
          sellerEmail={sellerId}
          sellerName={sellerName}
          currentVerification={verificationData}
          onClose={() => setShowVerificationModal(false)}
          onSuccess={() => {
            loadVerificationStatus();
            setAlertPopup({ message: 'Pengajuan verifikasi KTM berhasil dikirim ke Admin Koperasi! 🎓', type: 'success' });
          }}
        />
      )}

      {/* Alert Popup */}
      {alertPopup && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 12000,
          padding: '12px 20px',
          borderRadius: 16,
          background: alertPopup.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          fontWeight: 800,
          fontSize: 13,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span>{alertPopup.message}</span>
          <button onClick={() => setAlertPopup(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 900, fontSize: 14 }}>✕</button>
        </div>
      )}
    </div>
  );
}
