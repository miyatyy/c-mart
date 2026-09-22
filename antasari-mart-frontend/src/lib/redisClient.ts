// =========================================================================
// 🚀 ANTASARI MART - REDIS CLOUD & UPSTASH KV REST CLIENT
// High-Speed, Safe HTTP REST Redis - Zero Socket Leaks & 100% Mobile Stable
// =========================================================================

export interface RedisConfig {
  url: string;
  token: string;
  enabled: boolean;
}

// User-Configured Upstash Redis REST Config
export const DEFAULT_REDIS_CONFIG: RedisConfig = {
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL || 'https://liked-starling-84190.upstash.io',
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAUjeAAIgcDFmMDhjZDBjZjY4M2I0N2Y4YjdhYWUxNGVmYzA0N2I0NA',
  enabled: true
};

export function getRedisConfig(): RedisConfig {
  if (typeof window === 'undefined') return DEFAULT_REDIS_CONFIG;

  try {
    const savedUrl = localStorage.getItem('am_redis_rest_url') || DEFAULT_REDIS_CONFIG.url;
    const savedToken = localStorage.getItem('am_redis_rest_token') || DEFAULT_REDIS_CONFIG.token;
    return {
      url: (savedUrl || '').trim(),
      token: (savedToken || '').trim(),
      enabled: Boolean(savedUrl && savedToken)
    };
  } catch {
    return DEFAULT_REDIS_CONFIG;
  }
}

export function saveRedisConfig(url: string, token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('am_redis_rest_url', url.trim());
    localStorage.setItem('am_redis_rest_token', token.trim());
    localStorage.setItem('am_redis_enabled', 'true');
  }
}

/**
 * ⚡ Eksekusi Perintah Redis via Upstash REST API (Metode HTTP POST Standar Industri)
 */
export async function redisCommand<T = any>(command: string, ...args: (string | number)[]): Promise<T | null> {
  const config = getRedisConfig();
  if (!config.enabled || !config.url || !config.token) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const endpoint = config.url.replace(/\/+$/, '');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command.toLowerCase(), ...args.map(String)]),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    return data.result as T;
  } catch (_err) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * 📝 Redis Key-Value & List Operations Helper
 */
export const redis = {
  async get<T = any>(key: string): Promise<T | null> {
    const raw = await redisCommand<string>('get', key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  async set(key: string, value: any, expireSeconds?: number): Promise<boolean> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (expireSeconds && expireSeconds > 0) {
      const res = await redisCommand('setex', key, expireSeconds, serialized);
      return res === 'OK';
    }
    const res = await redisCommand('set', key, serialized);
    return res === 'OK';
  },

  async rpush(key: string, value: any, expireSeconds?: number): Promise<number | null> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const res = await redisCommand<number>('rpush', key, serialized);
    if (expireSeconds && expireSeconds > 0) {
      await redisCommand('expire', key, expireSeconds);
    }
    return res;
  },

  async expire(key: string, seconds: number): Promise<number | null> {
    return redisCommand<number>('expire', key, seconds);
  },

  async lrange<T = any>(key: string, start = 0, stop = -1): Promise<T[]> {
    const list = await redisCommand<string[]>('lrange', key, start, stop);
    if (!Array.isArray(list)) return [];
    return list.map(item => {
      try {
        return (typeof item === 'string' ? JSON.parse(item) : item) as T;
      } catch {
        return item as unknown as T;
      }
    });
  },

  async del(key: string): Promise<number | null> {
    return redisCommand<number>('del', key);
  }
};
