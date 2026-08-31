import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function CampusMartSplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 250);
    const timer2 = setTimeout(() => setProgress(75), 600);
    const timer3 = setTimeout(() => setProgress(100), 1000);

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1350);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 1750);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`cm-splash-screen ${isFadingOut ? 'cm-fade-out' : ''}`}>
      <style>{`
        .cm-splash-screen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: linear-gradient(145deg, #FFFFFF 0%, #F4FAF6 45%, #FDF0F4 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s ease;
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
          user-select: none;
        }

        .cm-splash-screen.cm-fade-out {
          opacity: 0;
          transform: scale(1.03);
          pointer-events: none;
        }

        .cm-splash-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 32px 28px;
          animation: cmFloatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cmFloatUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .cm-logo-container {
          position: relative;
          width: 90px;
          height: 90px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cm-logo-glow {
          position: absolute;
          inset: -6px;
          border-radius: 28px;
          background: radial-gradient(circle, rgba(95, 168, 116, 0.35) 0%, rgba(244, 174, 194, 0.25) 50%, rgba(255, 255, 255, 0) 70%);
          animation: cmPulseGlow 2.2s infinite ease-in-out;
        }

        @keyframes cmPulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 0.95; }
        }

        .cm-logo-box {
          width: 82px;
          height: 82px;
          border-radius: 24px;
          background: linear-gradient(135deg, #FFFFFF 0%, #F5FAF7 100%);
          border: 2px solid #E1ECE4;
          box-shadow: 0 10px 30px rgba(95, 168, 116, 0.15), 0 2px 8px rgba(0, 0, 0, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
        }

        .cm-logo-icon {
          font-size: 38px;
          line-height: 1;
          filter: drop-shadow(0 2px 6px rgba(95, 168, 116, 0.2));
        }

        .cm-brand-title {
          font-size: 26px;
          font-weight: 800;
          color: #243329;
          letter-spacing: -0.5px;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .cm-brand-title span.cm-highlight {
          color: #5FA874;
          font-weight: 800;
        }

        .cm-brand-subtitle {
          font-size: 13px;
          font-weight: 500;
          color: #687D70;
          margin: 0 0 24px 0;
          letter-spacing: 0.2px;
        }

        .cm-progress-container {
          width: 170px;
          height: 5px;
          background: #E8F2EC;
          border-radius: 999px;
          overflow: hidden;
          position: relative;
          margin-bottom: 22px;
        }

        .cm-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #5FA874 0%, #F4AEC2 100%);
          border-radius: 999px;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cm-badge-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #E1ECE4;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          color: #243329;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          backdrop-filter: blur(8px);
        }

        .cm-badge-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #5FA874;
          box-shadow: 0 0 8px #5FA874;
          animation: cmDotPulse 1.5s infinite;
        }

        @keyframes cmDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }
      `}</style>

      <div className="cm-splash-card">
        <div className="cm-logo-container">
          <div className="cm-logo-glow" />
          <div className="cm-logo-box">
            <span className="cm-logo-icon">🛍️</span>
          </div>
        </div>

        <h1 className="cm-brand-title">
          Campus <span className="cm-highlight">Mart</span>
        </h1>
        <p className="cm-brand-subtitle">
          UIN Antasari Banjarmasin • E-Commerce & Vending
        </p>

        <div className="cm-progress-container">
          <div className="cm-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="cm-badge-tag">
          <span className="cm-badge-dot" />
          <span>Memuat ekosistem kampus...</span>
        </div>
      </div>
    </div>
  );
}
