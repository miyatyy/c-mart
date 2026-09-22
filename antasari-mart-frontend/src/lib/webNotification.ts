/**
 * 🔔 Browser Web Notification Helper for Campus Mart
 * Mengelola izin Notification.requestPermission() dan memunculkan notifikasi browser sistem
 * saat aplikasi berada di background, tab lain, atau layar HP terkunci.
 */

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      return perm;
    }
    return Notification.permission;
  } catch (_e) {
    return 'denied';
  }
}

export function showSystemWebNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
  }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  try {
    const notifOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'campus_mart_chat',
      silent: false,
      data: options.data
    };

    // Gunakan ServiceWorkerRegistration jika tersedia (PWA / Mobile Chrome)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          ...notifOptions,
          vibrate: [200, 100, 200]
        } as any).catch(() => {
          triggerFallbackNotification(title, notifOptions, options.onClick, options.data);
        });
      }).catch(() => {
        triggerFallbackNotification(title, notifOptions, options.onClick, options.data);
      });
    } else {
      triggerFallbackNotification(title, notifOptions, options.onClick, options.data);
    }
  } catch (_e) {}
}

function triggerFallbackNotification(
  title: string,
  notifOptions: NotificationOptions,
  onClick?: () => void,
  data?: any
) {
  try {
    const notif = new Notification(title, notifOptions);
    notif.onclick = function (event) {
      event.preventDefault();
      try {
        window.focus();
        if (onClick) {
          onClick();
        } else if (data?.roomId || data?.senderId) {
          window.dispatchEvent(
            new CustomEvent('am_open_chat_room', {
              detail: {
                roomId: data.roomId,
                senderId: data.senderId
              }
            })
          );
        }
      } catch (_e) {}
      notif.close();
    };
  } catch (_e) {}
}
