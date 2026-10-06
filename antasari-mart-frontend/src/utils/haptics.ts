// 📳 Haptic Vibration Utility for Native Mobile Experience
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' | 'selection' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'light':
      case 'selection':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'success':
        navigator.vibrate([15, 60, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 80, 40]);
        break;
    }
  } catch (_e) {
    // Ignore unsupported or restricted vibration calls
  }
}
