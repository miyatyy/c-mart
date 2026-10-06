// 🛡️ Safe LocalStorage wrapper to prevent QuotaExceededError crashes
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] LocalStorage quota exceeded when writing "${key}". Cleaning up non-essential caches...`, err);
    try {
      // Remove bulky non-critical caches
      localStorage.removeItem('am_user_avatars_map');
      localStorage.removeItem('am_cached_products');
      localStorage.removeItem('am_debug_logs');
      // Retry
      localStorage.setItem(key, value);
      return true;
    } catch (_retryErr) {
      console.error(`[SafeStorage] Critical storage quota exceeded, unable to persist "${key}".`);
      return false;
    }
  }
}

// 🖼️ Compress base64/file image down to lightweight square avatar (~10-25 KB)
export function compressAvatarImage(file: File, maxDim = 180, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Crop center square
        const minSide = Math.min(width, height);
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
