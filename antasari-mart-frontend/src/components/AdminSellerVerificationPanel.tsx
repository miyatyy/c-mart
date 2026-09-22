import { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import type { SellerVerificationData, VerificationStatus } from '../types';
import {
  getAdminSellerVerificationsApi,
  updateSellerVerificationApi,
  getAdminKtmPhotoUrl
} from '../lib/api';

interface Props {
  adminEmail?: string;
  adminName?: string;
  adminRole?: 'admin' | 'super_admin';
}

export default function AdminSellerVerificationPanel({
  adminEmail = 'admin@koperasi.com',
  adminName = 'Pengurus Koperasi',
  adminRole = 'admin'
}: Props) {
  const [verifications, setVerifications] = useState<SellerVerificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'alumni'>('all');
  const [selectedKtmPhoto, setSelectedKtmPhoto] = useState<{ url: string; sellerName: string; nim: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      const res = await getAdminSellerVerificationsApi();
      if (res && res.success && res.verifications) {
        setVerifications(res.verifications);
      }
    } catch (err) {
      console.error('Gagal memuat daftar verifikasi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const handleApprove = async (item: SellerVerificationData) => {
    const result = await Swal.fire({
      title: 'Setujui Verifikasi KTM? 🎓',
      html: `Apakah Anda yakin ingin memvalidasi identitas mahasiswa aktif untuk <strong>${item.name || item.sellerName}</strong> (NIM: ${item.nim || '-'})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Setujui Sekarang',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsProcessing(item.email);
    try {
      const res = await updateSellerVerificationApi(item.email, {
        verificationStatus: 'approved',
        isActiveStudent: true,
        adminActor: {
          name: adminName,
          email: adminEmail,
          role: adminRole
        }
      });

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Verifikasi Berhasil Disetujui! 🎉',
          text: `Penjual "${item.name || item.sellerName}" resmi berstatus Mahasiswa Aktif Terverifikasi.`,
          timer: 2000,
          showConfirmButton: false
        });
        loadVerifications();
        window.dispatchEvent(new CustomEvent('am_seller_verification_updated'));
      } else {
        Swal.fire('Gagal', res.message || 'Terjadi kesalahan saat menyetujui.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menghubungi server.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (item: SellerVerificationData) => {
    const { value: reason } = await Swal.fire({
      title: 'Tolak Verifikasi KTM ❌',
      input: 'textarea',
      inputLabel: `Tuliskan alasan penolakan untuk ${item.name || item.sellerName}:`,
      inputPlaceholder: 'Contoh: Foto KTM buram / masa berlaku habis / NIM tidak ditemukan di SIAKAD...',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Kirim Alasan & Tolak',
      cancelButtonText: 'Batal'
    });

    if (!reason || !reason.trim()) return;

    setIsProcessing(item.email);
    try {
      const res = await updateSellerVerificationApi(item.email, {
        verificationStatus: 'rejected',
        rejectionReason: reason.trim(),
        adminActor: {
          name: adminName,
          email: adminEmail,
          role: adminRole
        }
      });

      if (res.success) {
        Swal.fire({
          icon: 'info',
          title: 'Verifikasi Ditolak',
          text: `Pemberitahuan alasan penolakan telah diteruskan ke penjual.`,
          timer: 2000,
          showConfirmButton: false
        });
        loadVerifications();
        window.dispatchEvent(new CustomEvent('am_seller_verification_updated'));
      } else {
        Swal.fire('Gagal', res.message || 'Gagal memperbarui status.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menghubungi server.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleActiveStudent = async (item: SellerVerificationData) => {
    const nextVal = !item.isActiveStudent;
    const actionText = nextVal ? 'Mengaktifkan Status Mahasiswa Aktif' : 'Menandai sebagai Alumni / Mahasiswa Tidak Aktif';
    const descText = nextVal
      ? 'Produk penjual ini akan kembali tampil normal di katalog publik.'
      : 'Produk penjual ini akan OTOMATIS DISEMBUNYIKAN dari katalog belanja pembeli.';

    const confirm = await Swal.fire({
      title: `${actionText}?`,
      text: descText,
      icon: nextVal ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: nextVal ? '#10B981' : '#F59E0B',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Ubah Status',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setIsProcessing(item.email);
    try {
      const res = await updateSellerVerificationApi(item.email, {
        isActiveStudent: nextVal,
        adminActor: {
          name: adminName,
          email: adminEmail,
          role: adminRole
        }
      });

      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: nextVal ? 'Status Mahasiswa Aktif 🟢' : 'Status Alumni Diaktifkan ⚠️',
          text: descText,
          timer: 2200,
          showConfirmButton: false
        });
        loadVerifications();
        window.dispatchEvent(new CustomEvent('am_seller_verification_updated'));
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal mengubah status aktif mahasiswa.', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  // Metrics
  const totalCount = verifications.length;
  const pendingCount = verifications.filter(v => v.verificationStatus === 'pending').length;
  const approvedCount = verifications.filter(v => v.verificationStatus === 'approved' && v.isActiveStudent !== false).length;
  const alumniCount = verifications.filter(v => v.isActiveStudent === false).length;
  const rejectedCount = verifications.filter(v => v.verificationStatus === 'rejected').length;

  // Filtered Items
  const filteredVerifications = useMemo(() => {
    return verifications.filter(v => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (v.name || v.sellerName || '').toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        (v.nim || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === 'pending') return v.verificationStatus === 'pending';
      if (statusFilter === 'approved') return v.verificationStatus === 'approved' && v.isActiveStudent !== false;
      if (statusFilter === 'alumni') return v.isActiveStudent === false;
      if (statusFilter === 'rejected') return v.verificationStatus === 'rejected';

      return true;
    });
  }, [verifications, searchQuery, statusFilter]);

  return (
    <div style={{ fontFamily: 'var(--am-font-body)' }}>
      {/* 📊 SUMMARY METRICS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: 14,
        marginBottom: 20
      }}>
        <div style={{
          background: 'var(--am-surface)',
          padding: '16px',
          borderRadius: 16,
          border: '1px solid var(--am-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--am-text-muted)', fontWeight: 800 }}>TOTAL PENJUAL</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--am-text)', marginTop: 4 }}>{totalCount} Penjual</div>
          <div style={{ fontSize: 11, color: 'var(--am-text-muted)', marginTop: 2 }}>Terdaftar di sistem</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.04) 100%)',
          padding: '16px',
          borderRadius: 16,
          border: '1.5px solid #F59E0B',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ fontSize: 11.5, color: '#92400E', fontWeight: 800 }}>⏳ PERLU DITINJAU (PENDING)</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B45309', marginTop: 4 }}>{pendingCount} Pengajuan</div>
          <div style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Membutuhkan verifikasi KTM</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.04) 100%)',
          padding: '16px',
          borderRadius: 16,
          border: '1.5px solid #10B981',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ fontSize: 11.5, color: '#065F46', fontWeight: 800 }}>✓ MAHASISWA AKTIF SAH</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#047857', marginTop: 4 }}>{approvedCount} Terverifikasi</div>
          <div style={{ fontSize: 11, color: '#065F46', marginTop: 2 }}>Produk tampil di katalog</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.04) 100%)',
          padding: '16px',
          borderRadius: 16,
          border: '1.5px solid #EF4444',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ fontSize: 11.5, color: '#991B1B', fontWeight: 800 }}>⚠️ ALUMNI / NON-AKTIF</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#B91C1C', marginTop: 4 }}>{alumniCount} Akun</div>
          <div style={{ fontSize: 11, color: '#991B1B', marginTop: 2 }}>Produk auto-hidden</div>
        </div>
      </div>

      {/* 🔍 FILTER & SEARCH BAR */}
      <div style={{
        background: 'var(--am-surface)',
        padding: '14px 18px',
        borderRadius: 16,
        border: '1px solid var(--am-border)',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            placeholder="🔍 Cari nama penjual, email, atau NIM..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: 10,
              border: '1px solid var(--am-border)',
              background: 'var(--am-bg)',
              color: 'var(--am-text)',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `Semua (${totalCount})` },
            { key: 'pending', label: `Pending (${pendingCount})` },
            { key: 'approved', label: `Aktif (${approvedCount})` },
            { key: 'alumni', label: `Alumni (${alumniCount})` },
            { key: 'rejected', label: `Ditolak (${rejectedCount})` }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key as any)}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: 'none',
                background: statusFilter === f.key ? 'var(--am-primary)' : 'var(--am-bg2)',
                color: statusFilter === f.key ? 'white' : 'var(--am-text-muted)',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}

          <button
            onClick={loadVerifications}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid var(--am-border)',
              background: 'transparent',
              color: 'var(--am-text)',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* 📋 VERIFICATION LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--am-text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <div style={{ fontWeight: 800 }}>Memuat data verifikasi penjual mahasiswa...</div>
        </div>
      ) : filteredVerifications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'var(--am-surface)',
          borderRadius: 16,
          border: '1px dashed var(--am-border)',
          color: 'var(--am-text-muted)'
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Tidak ada data verifikasi yang sesuai kriteria filter.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Penjual yang mengajukan KTM akan tampil di daftar ini.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filteredVerifications.map(item => {
            const isPending = item.verificationStatus === 'pending';
            const isApproved = item.verificationStatus === 'approved';
            const isRejected = item.verificationStatus === 'rejected';
            const isNotSubmitted = !item.verificationStatus || item.verificationStatus === 'not_submitted';
            const isAlumni = item.isActiveStudent === false;

            return (
              <div
                key={item.email}
                style={{
                  background: 'var(--am-surface)',
                  borderRadius: 18,
                  border: isPending
                    ? '1.5px solid #F59E0B'
                    : isApproved && !isAlumni
                      ? '1px solid #10B981'
                      : isAlumni
                        ? '1.5px solid #EF4444'
                        : '1px solid var(--am-border)',
                  padding: '18px 20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                {/* Left: Info Penjual & Akademik */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: isApproved && !isAlumni
                      ? '#10B981'
                      : isAlumni
                        ? '#EF4444'
                        : isPending
                          ? '#F59E0B'
                          : '#6B7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0
                  }}>
                    {isApproved && !isAlumni ? '✓' : isAlumni ? '⚠️' : isPending ? '⏳' : isRejected ? '✕' : '🎓'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isApproved && !isAlumni
                          ? '#10B981'
                          : isAlumni
                            ? '#EF4444'
                            : isPending
                              ? '#F59E0B'
                              : isRejected
                                ? '#DC2626'
                                : '#6B7280',
                        color: 'white'
                      }}>
                        {isPending
                          ? '⏳ PERLU DIVERIFIKASI'
                          : isApproved && !isAlumni
                            ? '✓ MAHASISWA AKTIF'
                            : isAlumni
                              ? '⚠️ ALUMNI (AUTO-HIDDEN)'
                              : isRejected
                                ? '❌ DITOLAK'
                                : 'BELUM SUBMIT'}
                      </span>

                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)' }}>
                        {item.role?.toUpperCase() || 'SELLER'}
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>
                      {item.name || item.sellerName || 'Penjual Mahasiswa'}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--am-text-muted)', marginTop: 2 }}>
                      ✉️ {item.email}
                    </div>

                    {/* Academic Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'var(--am-bg2)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: 'var(--am-text)'
                      }}>
                        🆔 NIM: <strong style={{ fontFamily: 'monospace' }}>{item.nim || '-'}</strong>
                      </span>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'var(--am-bg2)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: 'var(--am-text)'
                      }}>
                        🎓 Jenjang: <strong>{item.degreeLevel || 'S1'}</strong>
                      </span>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'var(--am-bg2)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: 'var(--am-text)'
                      }}>
                        📅 Angkatan: <strong>{item.entryYear || '-'}</strong>
                      </span>
                      <span style={{
                        fontSize: 11.5,
                        fontWeight: 800,
                        background: 'var(--am-bg2)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        color: 'var(--am-text)'
                      }}>
                        📚 Semester: <strong>{item.currentSemester || '-'}</strong>
                      </span>
                    </div>

                    {item.rejectionReason && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid #EF4444',
                        borderRadius: 8,
                        fontSize: 11.5,
                        color: '#B91C1C'
                      }}>
                        <strong>Alasan Penolakan:</strong> "{item.rejectionReason}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions & Photo Viewer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
                  {/* Photo Preview Button */}
                  {item.ktmPhotoUrl ? (
                    <button
                      onClick={() => setSelectedKtmPhoto({
                        url: getAdminKtmPhotoUrl(item.ktmPhotoUrl!),
                        sellerName: item.name || item.sellerName || item.email,
                        nim: item.nim || '-'
                      })}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--am-primary)',
                        background: 'rgba(95, 168, 116, 0.08)',
                        color: 'var(--am-primary)',
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span>🖼️</span> Lihat Foto Dokumen KTM
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--am-text-muted)', fontStyle: 'italic' }}>
                      (Foto KTM Belum Diunggah)
                    </span>
                  )}

                  {/* Active / Alumni Guard Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--am-text-muted)' }}>
                      Status Mahasiswa:
                    </span>
                    <button
                      onClick={() => handleToggleActiveStudent(item)}
                      disabled={isProcessing === item.email}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: item.isActiveStudent !== false ? '#10B981' : '#EF4444',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: 11.5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Klik untuk mengubah status aktif mahasiswa / alumni (otomatis sembunyikan produk jika alumni)"
                    >
                      <span>{item.isActiveStudent !== false ? '🟢 Mahasiswa Aktif' : '⚠️ Alumni (Hidden)'}</span>
                    </button>
                  </div>

                  {/* Approval / Rejection Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={isProcessing === item.email}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#10B981',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          ✓ Setujui Verifikasi
                        </button>
                        <button
                          onClick={() => handleReject(item)}
                          disabled={isProcessing === item.email}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#EF4444',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          ✕ Tolak
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => handleReject(item)}
                        disabled={isProcessing === item.email}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #EF4444',
                          background: 'transparent',
                          color: '#EF4444',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        Cabut Verifikasi
                      </button>
                    )}

                    {isRejected && (
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing === item.email}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #10B981',
                          background: 'transparent',
                          color: '#10B981',
                          fontWeight: 800,
                          fontSize: 11,
                          cursor: 'pointer'
                        }}
                      >
                        Setujui Ulang
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🖼️ SECURE KTM PHOTO VIEWER MODAL */}
      {selectedKtmPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setSelectedKtmPhoto(null)}
        >
          <div
            style={{
              background: 'var(--am-surface)',
              borderRadius: 20,
              maxWidth: 700,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: '1px solid var(--am-border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--am-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--am-bg2)'
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--am-primary)', textTransform: 'uppercase' }}>
                  🔒 DOKUMEN KTM TERENKRIPSI (ADMIN VIEW ONLY)
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: 'var(--am-text)' }}>
                  {selectedKtmPhoto.sellerName} (NIM: {selectedKtmPhoto.nim})
                </h3>
              </div>
              <button
                onClick={() => setSelectedKtmPhoto(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: 'var(--am-text-muted)',
                  fontWeight: 800
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, textAlign: 'center', background: '#0F172A' }}>
              <img
                src={selectedKtmPhoto.url}
                alt="Foto KTM Mahasiswa"
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: 12,
                  objectFit: 'contain',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
                onError={(e: any) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/600x400/1e293b/ffffff?text=Dokumen+KTM+Tersimpan+Aman';
                }}
              />
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span>🛡️</span> Akses dilindungi - Hanya pengurus Koperasi & Super Admin yang memiliki otorisasi melihat berkas ini.
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--am-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: 'var(--am-bg2)'
            }}>
              <button
                onClick={() => setSelectedKtmPhoto(null)}
                className="am-btn-primary"
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
