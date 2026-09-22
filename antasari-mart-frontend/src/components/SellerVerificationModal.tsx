import React, { useState, useRef, useMemo } from 'react';
import type { DegreeLevel, SessionUser, SellerVerificationData } from '../types';
import { submitSellerKtmVerificationApi } from '../lib/api';

interface SellerVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser;
  onVerificationSubmitted: (verificationData: SellerVerificationData) => void;
  existingData?: SellerVerificationData | null;
}

export default function SellerVerificationModal({
  isOpen,
  onClose,
  currentUser,
  onVerificationSubmitted,
  existingData
}: SellerVerificationModalProps) {
  const [nim, setNim] = useState<string>(existingData?.fullNim || existingData?.nim || (currentUser.nim as string) || '');
  const [fullName, setFullName] = useState<string>(existingData?.fullName || currentUser.nama || currentUser.name || '');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>(existingData?.degreeLevel || 'S1');
  const [entryYear, setEntryYear] = useState<number>(existingData?.entryYear || 2023);
  const [currentSemester, setCurrentSemester] = useState<number>(existingData?.currentSemester || 6);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Kalkulasi Otomatis Masa Studi Aktif
  const currentYear = new Date().getFullYear();
  const maxStudyYears = useMemo(() => {
    switch (degreeLevel) {
      case 'S3': return 5;
      case 'S2': return 4;
      case 'S1':
      default: return 7;
    }
  }, [degreeLevel]);

  const studyDuration = currentYear - entryYear;
  const isExceededStudyLimit = studyDuration > maxStudyYears;

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file gambar (JPG, PNG, atau WEBP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Ukuran file maksimal adalah 4 MB.');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!nim.trim()) {
      setErrorMessage('Nomor Induk Mahasiswa (NIM) wajib diisi.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Nama lengkap sesuai KTM wajib diisi.');
      return;
    }
    if (!selectedFile && !existingData?.hasKtmPhoto) {
      setErrorMessage('Foto Kartu Tanda Mahasiswa (KTM) wajib diunggah.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('email', currentUser.email);
      formData.append('fullName', fullName.trim());
      formData.append('nim', nim.trim());
      formData.append('degreeLevel', degreeLevel);
      formData.append('entryYear', entryYear.toString());
      formData.append('currentSemester', currentSemester.toString());

      if (selectedFile) {
        formData.append('ktmPhoto', selectedFile);
      }

      const res = await submitSellerKtmVerificationApi(formData);
      if (res.success && res.verification) {
        setSuccessMessage('Pengajuan verifikasi berhasil dikirim!');
        
        // Simpan state lokal
        try {
          const userKey = `am_seller_verification_${currentUser.email}`;
          localStorage.setItem(userKey, JSON.stringify(res.verification));
        } catch (_e) {}

        setTimeout(() => {
          onVerificationSubmitted(res.verification);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Gagal mengirim pengajuan verifikasi.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--am-surface, #FFFFFF)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.22)',
          border: '1px solid var(--am-border, #E2E8F0)',
          boxSizing: 'border-box',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--am-border, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
            color: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              🎓
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>
                Verifikasi Mahasiswa Aktif
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.85 }}>
                UIN Antasari Banjarmasin & Banjarbaru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Status Alert Banner */}
          {existingData?.verificationStatus === 'rejected' && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 12.5,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8
              }}
            >
              <span>❌</span>
              <div>
                <strong>Pengajuan Sebelumnya Ditolak:</strong>
                <p style={{ margin: '2px 0 0', opacity: 0.9 }}>
                  {existingData.rejectionReason || 'KTM buram atau tidak sesuai. Silakan perbaiki dan ajukan ulang.'}
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: 12.5,
                marginBottom: 16
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#047857',
                fontSize: 12.5,
                marginBottom: 16
              }}
            >
              ✓ {successMessage}
            </div>
          )}

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {/* NIM */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
                Nomor Induk Mahasiswa (NIM) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 21010101001"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border, #CBD5E1)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #F8FAFC)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Nama Sesuai KTM */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
                Nama Lengkap Sesuai KTM <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Siti Raisa Nur"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border, #CBD5E1)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #F8FAFC)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Jenjang */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
                Jenjang Studi <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={degreeLevel}
                onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border, #CBD5E1)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #F8FAFC)',
                  boxSizing: 'border-box'
                }}
              >
                <option value="S1">S1 (Sarjana - Maks 7 Thn)</option>
                <option value="S2">S2 (Magister - Maks 4 Thn)</option>
                <option value="S3">S3 (Doktoral - Maks 5 Thn)</option>
              </select>
            </div>

            {/* Angkatan / Tahun Masuk */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
                Tahun Masuk (Angkatan) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                min={2015}
                max={currentYear}
                value={entryYear}
                onChange={(e) => setEntryYear(parseInt(e.target.value) || currentYear)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border, #CBD5E1)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #F8FAFC)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Semester Saat Ini */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
                Semester Saat Ini <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="number"
                min={1}
                max={14}
                value={currentSemester}
                onChange={(e) => setCurrentSemester(parseInt(e.target.value) || 1)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--am-border, #CBD5E1)',
                  fontSize: 13.5,
                  outline: 'none',
                  background: 'var(--am-bg2, #F8FAFC)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Warning Masa Studi jika melebihi batas wajar */}
          {isExceededStudyLimit && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                color: '#92400E',
                fontSize: 12,
                marginBottom: 16,
                display: 'flex',
                gap: 8
              }}
            >
              <span>⚠️</span>
              <div>
                <strong>Peringatan Masa Studi:</strong>
                <p style={{ margin: '2px 0 0' }}>
                  Masa studi terdeteksi telah berjalan {studyDuration} tahun (batas wajar jenjang {degreeLevel} adalah {maxStudyYears} tahun). Pengajuan Anda akan memerlukan konfirmasi surat aktif kuliah tambahan dari fakultas saat ditinjau Admin.
                </p>
              </div>
            </div>
          )}

          {/* Upload Foto KTM Area */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--am-text, #1E293B)' }}>
              Foto Kartu Tanda Mahasiswa (KTM) <span style={{ color: '#DC2626' }}>*</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#10B981' : (previewUrl ? '#10B981' : '#CBD5E1')}`,
                borderRadius: 14,
                padding: previewUrl ? '12px' : '28px 16px',
                textAlign: 'center',
                background: isDragging ? 'rgba(16, 185, 129, 0.06)' : 'var(--am-bg2, #F8FAFC)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {previewUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
                  <img
                    src={previewUrl}
                    alt="Preview KTM"
                    style={{ width: 100, height: 65, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {selectedFile?.name || 'Foto KTM Terpilih'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Siap Diunggah'} • Klik untuk ganti foto
                    </div>
                    <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4 }}>
                      ✓ Foto Siap Dikirim ke Penyimpanan Privat
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🪪</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--am-text, #1E293B)' }}>
                    Tarik & Letakkan Foto KTM di Sini
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                    atau klik untuk memilih foto dari perangkat (JPG, PNG, WEBP, Maks. 4MB)
                  </div>
                  <div style={{ marginTop: 10, display: 'inline-block', padding: '4px 10px', background: '#E2E8F0', borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: '#475569' }}>
                    🔒 Data Terenkripsi & Hanya Dibuka oleh Pengurus Koperasi
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: '#F1F5F9',
              fontSize: 11,
              color: '#475569',
              marginBottom: 20,
              lineHeight: 1.4
            }}
          >
            🛡️ <strong>Kebijakan Perlindungan Privasi Data:</strong> Foto KTM hanya digunakan oleh Admin Koperasi untuk memvalidasi status mahasiswa aktif UIN Antasari. Foto disimpan dalam server privat terisolasi dan tidak dipublikasikan ke pembeli umum.
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 12,
                border: '1px solid var(--am-border, #CBD5E1)',
                background: 'transparent',
                color: 'var(--am-text, #475569)',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 13.5,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.75 : 1,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {isSubmitting ? 'Mengirim Data...' : 'Kirim Pengajuan Verifikasi 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
