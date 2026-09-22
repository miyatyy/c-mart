import { MIDTRANS_CLIENT_KEY } from './api';

/**
 * 💡 Load Midtrans Snap Script on-demand only when payment is initiated
 */
export function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // If snap is already available on window, resolve immediately
    if ((window as any).snap) {
      return resolve();
    }

    const existingScript = document.getElementById('midtrans-snap-script') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'midtrans-snap-script';
    script.type = 'text/javascript';
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.body.appendChild(script);
  });
}

/**
 * 🧹 Universal Cleanup Utility for Midtrans Snap Zombie Iframes and Overlays
 * Removes any remaining Snap container, iframe, or modal backdrop that could block user clicks.
 */
export function cleanupSnapOverlays(): void {
  if (typeof document === 'undefined') return;

  try {
    // 1. Close snap popup if active via window.snap API
    if (typeof window !== 'undefined' && (window as any).snap?.hide) {
      try {
        (window as any).snap.hide();
      } catch (_e) {}
    }

    // 2. Selectors for Snap DOM elements
    const snapContainer = document.getElementById('snap-container');
    if (snapContainer) {
      try {
        snapContainer.remove();
      } catch (_e) {
        snapContainer.parentNode?.removeChild(snapContainer);
      }
    }

    const snapSelectors = [
      '#snap-container',
      '#snap-overlay',
      '#snap-midtrans',
      'iframe[src*="midtrans"]',
      'iframe[id*="snap"]',
      'iframe[name*="snap"]',
      'div[id*="snap-"]',
      'div[class*="snap-"]',
      '.snap-popup',
      '.snap-overlay',
      '.snap-modal',
      '.snap-container'
    ];

    snapSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        try {
          el.remove();
        } catch (_e) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
      });
    });

    // 3. Clear any leftover Midtrans tokens from storage
    try {
      localStorage.removeItem('am_snap_token');
      sessionStorage.removeItem('am_snap_token');
    } catch (_e) {}

    // 4. Reset document body overflow if Snap locked it
    if (document.body && document.body.style.overflow === 'hidden' && !document.querySelector('.am-modal-open')) {
      document.body.style.overflow = '';
    }
  } catch (err) {
    console.warn('Snap cleanup warning:', err);
  }
}
