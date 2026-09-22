import React from 'react';

export default function CampusMartPixelBackground() {
  return (
    <div className="am-retro-pixel-world" aria-hidden="true">
      <style>{`
        .am-retro-pixel-world {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 1;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        /* ── 16-BIT RETRO SKY GRADIENT ── */
        .am-pixel-sky {
          position: absolute;
          inset: 0;
          height: 68%;
          background: linear-gradient(180deg, #132a1e 0%, #1e4532 40%, #2e694b 75%, #428e67 100%);
        }

        /* ── PIXEL CLOUDS DRIFTING ── */
        .am-cloud-pixel {
          position: absolute;
          animation: cloudMove linear infinite;
        }

        @keyframes cloudMove {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(105vw); }
        }

        /* ── FLOATING PIXEL PETALS / SPARKLES ── */
        @keyframes petalFloat {
          0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) translateX(90px) rotate(360deg); opacity: 0; }
        }

        .am-pixel-petal-drop {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #fbcfe8;
          box-shadow: 2px 2px 0 #f472b6;
          animation: petalFloat linear infinite;
        }

        /* ── 8-BIT / 16-BIT RETRO GROUND ── */
        .am-pixel-ground-layer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background-color: #78350f;
          background-image:
            linear-gradient(180deg, #15803d 0px, #15803d 14px, #166534 14px, #166534 18px, transparent 18px),
            linear-gradient(90deg, #92400e 3px, transparent 3px),
            linear-gradient(180deg, #92400e 3px, transparent 3px);
          background-size: 100% 100%, 28px 20px, 28px 20px;
          box-shadow: inset 0 8px 0 #22c55e, 0 -4px 0 #14532d;
          z-index: 2;
        }

        /* ── 8-BIT QUESTION BLOCKS & COIN SPIN ── */
        .am-qblock-float {
          position: absolute;
          animation: qBob 1.8s steps(2) infinite;
        }

        @keyframes qBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes coinSpinning {
          0% { transform: scaleX(1); }
          25% { transform: scaleX(0.2); }
          50% { transform: scaleX(-1); }
          75% { transform: scaleX(-0.2); }
          100% { transform: scaleX(1); }
        }

        .am-coin-anim {
          animation: coinSpinning 0.9s steps(4) infinite;
          transform-origin: center;
        }

        /* ── STEPPED RETRO ANIMATIONS ── */
        @keyframes charIdleStep {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes tailWag {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(18deg); }
        }

        @keyframes girlWalkStroll {
          0% {
            left: -120px;
            transform: scaleX(1);
          }
          48% {
            left: calc(100vw + 80px);
            transform: scaleX(1);
          }
          50% {
            left: calc(100vw + 80px);
            transform: scaleX(-1);
          }
          98% {
            left: -120px;
            transform: scaleX(-1);
          }
          100% {
            left: -120px;
            transform: scaleX(1);
          }
        }

        @keyframes scooterRide {
          0% { left: -160px; }
          100% { left: 110vw; }
        }

        @keyframes piranhaPoke {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }

        @keyframes neonFlicker {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 10px #34d399); }
          50% { opacity: 0.85; filter: drop-shadow(0 0 18px #6ee7b7); }
        }

        /* Responsive Mobile Scaling */
        @media (max-width: 840px) {
          .am-left-hangout {
            display: none !important;
          }
          .am-right-vending-spot {
            right: 4px !important;
            transform: scale(0.85);
            transform-origin: bottom right;
          }
          .am-strolling-girl {
            bottom: 44px !important;
            transform: scale(0.8);
          }
        }
      `}</style>

      {/* 🌌 SKY BACKGROUND */}
      <div className="am-pixel-sky" />

      {/* ☁️ 16-BIT RETRO PIXEL CLOUDS */}
      <div className="am-cloud-pixel" style={{ top: '6%', animationDuration: '45s', animationDelay: '0s' }}>
        <svg width="140" height="60" viewBox="0 0 28 12" shapeRendering="crispEdges">
          <rect x="6" y="2" width="16" height="8" fill="#ffffff" opacity="0.45" />
          <rect x="3" y="4" width="22" height="6" fill="#ffffff" opacity="0.45" />
          <rect x="9" y="0" width="10" height="12" fill="#ffffff" opacity="0.45" />
          <rect x="1" y="6" width="26" height="3" fill="#ffffff" opacity="0.45" />
        </svg>
      </div>
      <div className="am-cloud-pixel" style={{ top: '16%', animationDuration: '65s', animationDelay: '-22s' }}>
        <svg width="180" height="75" viewBox="0 0 36 15" shapeRendering="crispEdges">
          <rect x="8" y="3" width="20" height="10" fill="#ffffff" opacity="0.35" />
          <rect x="4" y="6" width="28" height="7" fill="#ffffff" opacity="0.35" />
          <rect x="12" y="1" width="12" height="14" fill="#ffffff" opacity="0.35" />
          <rect x="1" y="8" width="34" height="4" fill="#ffffff" opacity="0.35" />
        </svg>
      </div>

      {/* 🌸 FALLING PIXEL SAKURA / MELATI PETALS */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="am-pixel-petal-drop"
          style={{
            left: `${i * 10 + 4}%`,
            animationDuration: `${6.5 + (i % 4) * 2}s`,
            animationDelay: `${i * 1.1}s`
          }}
        />
      ))}

      {/* ❓ MARIO QUESTION BLOCKS & SPINNING COINS */}
      <div className="am-qblock-float" style={{ top: '14%', left: '7%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div className="am-coin-anim">
            <svg width="24" height="24" viewBox="0 0 8 8" shapeRendering="crispEdges">
              <rect x="2" y="0" width="4" height="8" fill="#fbbf24" />
              <rect x="1" y="1" width="6" height="6" fill="#f59e0b" />
              <rect x="3" y="2" width="2" height="4" fill="#fef08a" />
            </svg>
          </div>
          <svg width="44" height="44" viewBox="0 0 16 16" shapeRendering="crispEdges">
            <rect x="0" y="0" width="16" height="16" fill="#f59e0b" />
            <rect x="1" y="1" width="14" height="1" fill="#fef08a" />
            <rect x="1" y="1" width="1" height="14" fill="#fef08a" />
            <rect x="14" y="1" width="1" height="14" fill="#78350f" />
            <rect x="1" y="14" width="14" height="1" fill="#78350f" />
            <rect x="2" y="2" width="1" height="1" fill="#78350f" />
            <rect x="13" y="2" width="1" height="1" fill="#78350f" />
            <rect x="2" y="13" width="1" height="1" fill="#78350f" />
            <rect x="13" y="13" width="1" height="1" fill="#78350f" />
            <rect x="6" y="4" width="4" height="1" fill="#78350f" />
            <rect x="5" y="5" width="2" height="2" fill="#78350f" />
            <rect x="9" y="5" width="2" height="2" fill="#78350f" />
            <rect x="8" y="7" width="2" height="2" fill="#78350f" />
            <rect x="7" y="9" width="2" height="2" fill="#78350f" />
            <rect x="7" y="12" width="2" height="2" fill="#78350f" />
          </svg>
        </div>
      </div>

      <div className="am-qblock-float" style={{ top: '16%', right: '8%', animationDelay: '-0.9s' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div className="am-coin-anim" style={{ animationDelay: '-0.4s' }}>
            <svg width="24" height="24" viewBox="0 0 8 8" shapeRendering="crispEdges">
              <rect x="2" y="0" width="4" height="8" fill="#34d399" />
              <rect x="1" y="1" width="6" height="6" fill="#10b981" />
              <rect x="3" y="2" width="2" height="4" fill="#a7f3d0" />
            </svg>
          </div>
          <svg width="44" height="44" viewBox="0 0 16 16" shapeRendering="crispEdges">
            <rect x="0" y="0" width="16" height="16" fill="#10b981" />
            <rect x="1" y="1" width="14" height="1" fill="#a7f3d0" />
            <rect x="1" y="1" width="1" height="14" fill="#a7f3d0" />
            <rect x="14" y="1" width="1" height="14" fill="#064e3b" />
            <rect x="1" y="14" width="14" height="1" fill="#064e3b" />
            {/* Heart on Block */}
            <rect x="5" y="5" width="2" height="2" fill="#ffffff" />
            <rect x="9" y="5" width="2" height="2" fill="#ffffff" />
            <rect x="4" y="6" width="8" height="3" fill="#ffffff" />
            <rect x="5" y="9" width="6" height="2" fill="#ffffff" />
            <rect x="7" y="11" width="2" height="2" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* 🛵 16-BIT MOTORCYCLE COURIER */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        animation: 'scooterRide 19s linear infinite',
        zIndex: 2
      }}>
        <svg width="84" height="52" viewBox="0 0 28 17" shapeRendering="crispEdges">
          {/* Helm & Driver */}
          <rect x="11" y="1" width="6" height="5" fill="#f59e0b" />
          <rect x="15" y="2" width="3" height="2" fill="#1e293b" />
          <rect x="11" y="6" width="6" height="6" fill="#10b981" />
          {/* Kotak Antasari Express */}
          <rect x="3" y="4" width="7" height="8" fill="#ea580c" />
          <rect x="5" y="6" width="3" height="4" fill="#ffffff" />
          {/* Motor Body */}
          <rect x="8" y="10" width="14" height="3" fill="#0284c7" />
          <rect x="18" y="6" width="2" height="4" fill="#cbd5e1" />
          {/* Roda Pixel */}
          <rect x="4" y="11" width="5" height="5" fill="#0f172a" />
          <rect x="5" y="12" width="3" height="3" fill="#94a3b8" />
          <rect x="19" y="11" width="5" height="5" fill="#0f172a" />
          <rect x="20" y="12" width="3" height="3" fill="#94a3b8" />
        </svg>
      </div>

      {/* 🌿 16-BIT GROUND BASE */}
      <div className="am-pixel-ground-layer" />

      {/* ─────────────────────────────────────────────────────────────
          🏪 SUDUT KANAN:
          SMART VENDING MACHINE (BESAR), MAHASISWI HIJAB (BESAR),
          PIPA HIJAU MARIO DENGAN BUNGA, LAMPU JALAN PIXEL
         ───────────────────────────────────────────────────────────── */}
      <div className="am-right-vending-spot" style={{
        position: 'absolute',
        bottom: '76px',
        right: '24px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        zIndex: 4
      }}>
        {/* 🟩 Pipa Hijau Mario + Bunga Piranha Imut */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ animation: 'piranhaPoke 2.4s steps(2) infinite', marginBottom: '-4px' }}>
            {/* Bunga Pixel Cantik */}
            <svg width="28" height="28" viewBox="0 0 10 10" shapeRendering="crispEdges">
              <rect x="4" y="1" width="2" height="2" fill="#f43f5e" />
              <rect x="2" y="3" width="2" height="2" fill="#f43f5e" />
              <rect x="6" y="3" width="2" height="2" fill="#f43f5e" />
              <rect x="4" y="5" width="2" height="2" fill="#f43f5e" />
              <rect x="4" y="3" width="2" height="2" fill="#fef08a" />
              <rect x="4" y="7" width="2" height="3" fill="#15803d" />
            </svg>
          </div>
          {/* Pipa Hijau */}
          <svg width="44" height="48" viewBox="0 0 14 16" shapeRendering="crispEdges">
            <rect x="0" y="0" width="14" height="5" fill="#15803d" />
            <rect x="1" y="1" width="12" height="3" fill="#22c55e" />
            <rect x="1" y="1" width="2" height="3" fill="#86efac" />
            <rect x="12" y="1" width="1" height="3" fill="#14532d" />
            <rect x="2" y="5" width="10" height="11" fill="#15803d" />
            <rect x="3" y="5" width="8" height="11" fill="#22c55e" />
            <rect x="3" y="5" width="2" height="11" fill="#86efac" />
            <rect x="9" y="5" width="2" height="11" fill="#14532d" />
          </svg>
        </div>

        {/* 🧕 MAHASISWI HIJAB 16-BIT (DIPERBESAR & LEBIH DETAIL) */}
        <div style={{ animation: 'charIdleStep 1.6s steps(2) infinite' }}>
          <svg width="84" height="135" viewBox="0 0 20 32" shapeRendering="crispEdges">
            {/* Hijab Pink Pastel dengan Layer & Shading */}
            <rect x="5" y="2" width="10" height="11" fill="#f472b6" />
            <rect x="6" y="1" width="8" height="13" fill="#f472b6" />
            <rect x="4" y="5" width="12" height="11" fill="#ec4899" />
            <rect x="7" y="2" width="2" height="2" fill="#fbcfe8" />
            {/* Wajah Chibi Lucu */}
            <rect x="7" y="4" width="6" height="6" fill="#fed7aa" />
            {/* Mata Berbinar Pixel */}
            <rect x="8" y="6" width="1" height="2" fill="#0f172a" />
            <rect x="11" y="6" width="1" height="2" fill="#0f172a" />
            {/* Pipi Merona Pink */}
            <rect x="7" y="8" width="1" height="1" fill="#f43f5e" />
            <rect x="12" y="8" width="1" height="1" fill="#f43f5e" />
            {/* Senyum */}
            <rect x="9" y="8" width="2" height="1" fill="#9f1239" />
            {/* Gamis/Tunik Hijau Sage UIN */}
            <rect x="4" y="14" width="12" height="10" fill="#10b981" />
            <rect x="5" y="14" width="10" height="10" fill="#34d399" />
            <rect x="6" y="15" width="8" height="9" fill="#059669" />
            <rect x="9" y="14" width="2" height="10" fill="#a7f3d0" />
            {/* Rok / Celana */}
            <rect x="6" y="24" width="8" height="4" fill="#064e3b" />
            {/* Sepatu Sneakers Pixel Putih-Pink */}
            <rect x="5" y="28" width="4" height="3" fill="#ffffff" />
            <rect x="5" y="30" width="4" height="1" fill="#f472b6" />
            <rect x="11" y="28" width="4" height="3" fill="#ffffff" />
            <rect x="11" y="30" width="4" height="1" fill="#f472b6" />
            {/* Tangan Kanan Megang Blind Bag Box Emas */}
            <rect x="2" y="16" width="4" height="5" fill="#f59e0b" />
            <rect x="3" y="17" width="2" height="3" fill="#fef08a" />
            <rect x="4" y="15" width="1" height="1" fill="#ffffff" />
            {/* Tangan Kiri Megang Cup Boba Matcha 🧋 */}
            <rect x="14" y="15" width="4" height="6" fill="#a7f3d0" />
            <rect x="15" y="14" width="2" height="2" fill="#10b981" />
            <rect x="16" y="12" width="1" height="3" fill="#78350f" />
          </svg>
        </div>

        {/* 🤖 16-BIT SMART VENDING MACHINE (BESAR, GLOWING & DETAIL) */}
        <div style={{ animation: 'neonFlicker 3.5s steps(2) infinite' }}>
          <svg width="105" height="162" viewBox="0 0 24 37" shapeRendering="crispEdges">
            {/* Outer Frame Hijau Emerald */}
            <rect x="1" y="1" width="22" height="35" fill="#064e3b" />
            <rect x="2" y="2" width="20" height="33" fill="#0f766e" />
            <rect x="2" y="2" width="2" height="33" fill="#2dd4bf" />
            {/* Header Lamp 'CAMPUS VEND' */}
            <rect x="3" y="3" width="18" height="5" fill="#042f2e" />
            <rect x="5" y="4" width="14" height="3" fill="#34d399" />
            <rect x="7" y="5" width="10" height="1" fill="#ffffff" />
            {/* Glass Display (Transparan Gelap) */}
            <rect x="3" y="9" width="18" height="16" fill="#022c22" />
            {/* Baris 1: Minuman Kaleng & Botol Pixel */}
            <rect x="5" y="11" width="2" height="4" fill="#ef4444" />
            <rect x="8" y="11" width="2" height="4" fill="#3b82f6" />
            <rect x="11" y="11" width="2" height="4" fill="#10b981" />
            <rect x="14" y="11" width="2" height="4" fill="#f59e0b" />
            <rect x="17" y="11" width="2" height="4" fill="#ec4899" />
            <rect x="4" y="15" width="16" height="1" fill="#14b8a6" />
            {/* Baris 2: Blind Bags & Ganci Rajut */}
            <rect x="5" y="17" width="3" height="4" fill="#fbbf24" />
            <rect x="9" y="17" width="3" height="4" fill="#c084fc" />
            <rect x="13" y="17" width="3" height="4" fill="#f472b6" />
            <rect x="17" y="17" width="2" height="4" fill="#38bdf8" />
            <rect x="4" y="21" width="16" height="1" fill="#14b8a6" />
            {/* Control Panel (QR Screen + Tombol) */}
            <rect x="3" y="26" width="9" height="5" fill="#042f2e" />
            <rect x="4" y="27" width="7" height="3" fill="#6ee7b7" />
            <rect x="14" y="27" width="2" height="2" fill="#ef4444" />
            <rect x="17" y="27" width="2" height="2" fill="#10b981" />
            {/* Pintu Pengambilan Produk */}
            <rect x="4" y="32" width="16" height="3" fill="#042f2e" />
            <rect x="10" y="33" width="4" height="1" fill="#34d399" />
          </svg>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ☕ SUDUT KIRI:
          MEJA CAFE PIXEL, KUCING OREN KAMPUS TIDUR,
          MAHASISWA COWOK NGOPI & TEMAN SANTAI
         ───────────────────────────────────────────────────────────── */}
      <div className="am-left-hangout" style={{
        position: 'absolute',
        bottom: '76px',
        left: '20px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        zIndex: 4
      }}>
        {/* 🐱 Kucing Oren Kampus Tidur di Bangku Pixel */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Kucing Oren */}
          <div style={{ marginBottom: '-2px' }}>
            <svg width="36" height="24" viewBox="0 0 12 8" shapeRendering="crispEdges">
              {/* Badan Kucing Bulat */}
              <rect x="2" y="2" width="7" height="5" rx="1" fill="#f97316" />
              <rect x="3" y="3" width="5" height="4" fill="#fb923c" />
              {/* Kepala & Telinga */}
              <rect x="7" y="1" width="4" height="4" fill="#f97316" />
              <rect x="7" y="0" width="1" height="2" fill="#ea580c" />
              <rect x="10" y="0" width="1" height="2" fill="#ea580c" />
              {/* Mata Tidur Nyaman */}
              <rect x="9" y="2" width="2" height="1" fill="#7c2d12" />
              {/* Ekor Bergerak */}
              <rect x="0" y="2" width="2" height="2" fill="#ea580c" style={{ animation: 'tailWag 1.8s steps(2) infinite', transformOrigin: 'bottom right' }} />
            </svg>
          </div>
          {/* Bangku Kayu Pixel */}
          <svg width="48" height="26" viewBox="0 0 16 9" shapeRendering="crispEdges">
            <rect x="1" y="2" width="14" height="3" fill="#92400e" />
            <rect x="2" y="0" width="12" height="2" fill="#b45309" />
            <rect x="3" y="5" width="2" height="4" fill="#451a03" />
            <rect x="11" y="5" width="2" height="4" fill="#451a03" />
          </svg>
        </div>

        {/* ☕ Meja Cafe Kampus + Cup Kopi & Boba */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Minuman di atas meja */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '-2px' }}>
            <svg width="12" height="14" viewBox="0 0 4 5" shapeRendering="crispEdges">
              <rect x="0" y="1" width="4" height="4" fill="#fef3c7" />
              <rect x="0" y="0" width="4" height="1" fill="#78350f" />
            </svg>
            <svg width="12" height="14" viewBox="0 0 4 5" shapeRendering="crispEdges">
              <rect x="0" y="1" width="4" height="4" fill="#a7f3d0" />
              <rect x="1" y="0" width="1" height="2" fill="#10b981" />
            </svg>
          </div>
          {/* Meja Bundar Pixel */}
          <svg width="38" height="34" viewBox="0 0 14 12" shapeRendering="crispEdges">
            <rect x="1" y="0" width="12" height="3" fill="#b45309" />
            <rect x="6" y="3" width="2" height="7" fill="#78350f" />
            <rect x="4" y="10" width="6" height="2" fill="#451a03" />
          </svg>
        </div>

        {/* 🧑 MAHASISWA COWOK 16-BIT (DIPERBESAR & DETAIL) */}
        <div style={{ animation: 'charIdleStep 1.9s steps(2) infinite' }}>
          <svg width="80" height="130" viewBox="0 0 20 32" shapeRendering="crispEdges">
            {/* Rambut Keren Pixel */}
            <rect x="5" y="2" width="10" height="4" fill="#1e293b" />
            <rect x="4" y="3" width="12" height="4" fill="#1e293b" />
            {/* Wajah */}
            <rect x="6" y="5" width="8" height="6" fill="#fed7aa" />
            <rect x="7" y="7" width="1" height="2" fill="#0f172a" />
            <rect x="11" y="7" width="1" height="2" fill="#0f172a" />
            <rect x="8" y="9" width="3" height="1" fill="#9f1239" />
            {/* Jaket Varsity Kampus Hijau Emerald */}
            <rect x="4" y="11" width="12" height="11" fill="#047857" />
            <rect x="6" y="12" width="8" height="9" fill="#10b981" />
            <rect x="9" y="11" width="2" height="11" fill="#ffffff" />
            <rect x="5" y="11" width="1" height="11" fill="#fef08a" />
            <rect x="14" y="11" width="1" height="11" fill="#fef08a" />
            {/* Celana Jeans Denim */}
            <rect x="6" y="22" width="8" height="6" fill="#1d4ed8" />
            <rect x="6" y="25" width="3" height="4" fill="#1e40af" />
            <rect x="11" y="25" width="3" height="4" fill="#1e40af" />
            {/* Sepatu Sneakers Retro */}
            <rect x="5" y="28" width="4" height="3" fill="#f8fafc" />
            <rect x="5" y="30" width="4" height="1" fill="#dc2626" />
            <rect x="11" y="28" width="4" height="3" fill="#f8fafc" />
            <rect x="11" y="30" width="4" height="1" fill="#dc2626" />
            {/* Tangan Kanan bawa Mug Kopi ☕ */}
            <rect x="15" y="14" width="4" height="5" fill="#fef3c7" />
            <rect x="16" y="13" width="3" height="1" fill="#78350f" />
            <rect x="18" y="15" width="1" height="3" fill="#d97706" />
          </svg>
        </div>

        {/* 🧑 TEMAN MAHASISWA (KAOS MERAH & TOPI) */}
        <div style={{ animation: 'charIdleStep 2.3s steps(2) infinite', animationDelay: '-0.8s' }}>
          <svg width="74" height="122" viewBox="0 0 19 30" shapeRendering="crispEdges">
            {/* Topi Snapback Merah */}
            <rect x="4" y="1" width="10" height="3" fill="#dc2626" />
            <rect x="3" y="3" width="13" height="2" fill="#b91c1c" />
            {/* Wajah */}
            <rect x="5" y="5" width="8" height="6" fill="#fde047" />
            <rect x="6" y="7" width="1" height="2" fill="#0f172a" />
            <rect x="10" y="7" width="1" height="2" fill="#0f172a" />
            {/* Kaos Putih & Kemeja Flannel Merah */}
            <rect x="4" y="11" width="10" height="9" fill="#f8fafc" />
            <rect x="4" y="11" width="2" height="9" fill="#dc2626" />
            <rect x="12" y="11" width="2" height="9" fill="#dc2626" />
            {/* Celana Chino Cokelat */}
            <rect x="5" y="20" width="8" height="6" fill="#d97706" />
            <rect x="5" y="22" width="3" height="5" fill="#b45309" />
            <rect x="10" y="22" width="3" height="5" fill="#b45309" />
            {/* Sepatu Hitam */}
            <rect x="4" y="27" width="4" height="3" fill="#0f172a" />
            <rect x="10" y="27" width="4" height="3" fill="#0f172a" />
          </svg>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          🛍️ MAHASISWI NON-HIJAB 16-BIT BERJALAN MELINTASI LAYAR
          MEMBAWA BUKET BUNGA RAJUT & TAS BELANJA ANTASARI MART
         ───────────────────────────────────────────────────────────── */}
      <div className="am-strolling-girl" style={{
        position: 'absolute',
        bottom: '78px',
        animation: 'girlWalkStroll 24s linear infinite',
        zIndex: 5
      }}>
        <div style={{ animation: 'charIdleStep 0.5s steps(2) infinite' }}>
          <svg width="80" height="132" viewBox="0 0 20 32" shapeRendering="crispEdges">
            {/* Rambut Ponytail Cokelat & Pita Merah Lucu */}
            <rect x="5" y="2" width="10" height="9" fill="#78350f" />
            <rect x="4" y="4" width="12" height="7" fill="#78350f" />
            <rect x="14" y="3" width="4" height="6" fill="#78350f" />
            <rect x="13" y="2" width="3" height="3" fill="#f43f5e" />
            {/* Wajah Imut Tersenyum */}
            <rect x="6" y="5" width="8" height="6" fill="#fed7aa" />
            <rect x="7" y="7" width="1" height="2" fill="#0f172a" />
            <rect x="11" y="7" width="1" height="2" fill="#0f172a" />
            <rect x="6" y="9" width="1" height="1" fill="#fb7185" />
            <rect x="12" y="9" width="1" height="1" fill="#fb7185" />
            <rect x="8" y="9" width="3" height="1" fill="#be123c" />
            {/* Cardigan Kuning Pastel */}
            <rect x="4" y="11" width="11" height="8" fill="#facc15" />
            <rect x="5" y="12" width="9" height="7" fill="#fde047" />
            {/* Rok Plisket Pink Pastel */}
            <rect x="5" y="19" width="9" height="5" fill="#f472b6" />
            <rect x="6" y="20" width="7" height="4" fill="#fb7185" />
            {/* Kaki Berjalan */}
            <rect x="6" y="24" width="2" height="4" fill="#fed7aa" />
            <rect x="10" y="24" width="2" height="4" fill="#fed7aa" />
            {/* Sepatu Boots Cokelat */}
            <rect x="5" y="28" width="4" height="3" fill="#92400e" />
            <rect x="10" y="28" width="4" height="3" fill="#92400e" />
            {/* Tangan Kanan: Shopping Bag Hijau Antasari Mart 🛍️ */}
            <rect x="14" y="14" width="5" height="7" fill="#10b981" />
            <rect x="15" y="12" width="3" height="2" fill="#059669" />
            <rect x="15" y="16" width="3" height="3" fill="#ffffff" />
            {/* Tangan Kiri: Buket Bunga Rajut Pink & Merah 🌸 */}
            <rect x="1" y="13" width="4" height="6" fill="#ec4899" />
            <rect x="2" y="11" width="2" height="3" fill="#fbcfe8" />
            <rect x="0" y="11" width="2" height="2" fill="#f43f5e" />
            <rect x="3" y="10" width="2" height="2" fill="#fbbf24" />
          </svg>
        </div>
      </div>
    </div>
  );
}
