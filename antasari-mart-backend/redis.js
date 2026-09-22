/**
 * ⚡ Redis In-Memory Caching Module with Safe Fallback for Antasari Mart
 * 
 * Fitur:
 * - Menyediakan caching performa tinggi (TTL-based) untuk katalog produk dan endpoint publik.
 * - Safe Fallback: Jika Redis offline / tidak terpasang di sistem lokal, fungsi cache otomatis
 *   mengembalikan null (cache-miss) tanpa memicu unhandled rejection atau membuat Express server crash.
 */

const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_URL = process.env.REDIS_URL || undefined;

let redisClient = null;
let isConnected = false;
let hasLoggedOfflineWarning = false;

try {
  const options = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) {
        if (!hasLoggedOfflineWarning) {
          console.log('ℹ️ [Redis] Server Redis offline / belum aktif. Mode Fallback Database aktif (Kueri langsung ke PostgreSQL).');
          hasLoggedOfflineWarning = true;
        }
        return null; // Berhenti retry agar tidak membebani CPU
      }
      return Math.min(times * 1000, 3000);
    }
  };

  redisClient = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis(options);

  redisClient.on('connect', () => {
    isConnected = true;
    hasLoggedOfflineWarning = false;
    console.log('⚡ [Redis] Terhubung ke Redis In-Memory Cache Server!');
  });

  redisClient.on('ready', () => {
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    if (!hasLoggedOfflineWarning) {
      console.log(`ℹ️ [Redis] Safe Fallback Aktif (${err.message || 'Offline'}). Database PostgreSQL berjalan normal.`);
      hasLoggedOfflineWarning = true;
    }
  });

  redisClient.on('close', () => {
    isConnected = false;
  });

  // Coba inisialisasi koneksi awal di background tanpa memblokir startup Express
  redisClient.connect().catch(() => {
    isConnected = false;
  });
} catch (_initErr) {
  isConnected = false;
}

/**
 * Mengambil data dari cache Redis
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function getCache(key) {
  if (!redisClient || !isConnected) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (_e) {
    return null;
  }
}

/**
 * Menyimpan data ke cache Redis dengan masa berlaku (TTL)
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds Default: 60 detik
 * @returns {Promise<boolean>}
 */
async function setCache(key, value, ttlSeconds = 60) {
  if (!redisClient || !isConnected) return false;
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, str, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, str);
    }
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Menghapus cache berdasarkan key spesifik
 * @param {string} key
 * @returns {Promise<boolean>}
 */
async function delCache(key) {
  if (!redisClient || !isConnected) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Menghapus kumpulan cache berdasarkan pola wildcard (misal: 'products:*')
 * @param {string} pattern
 * @returns {Promise<number>} Jumlah key yang dihapus
 */
async function delCachePattern(pattern) {
  if (!redisClient || !isConnected) return 0;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      const count = await redisClient.del(...keys);
      return count;
    }
    return 0;
  } catch (_e) {
    return 0;
  }
}

/**
 * Cek status ketersediaan Redis
 * @returns {boolean}
 */
function isRedisAvailable() {
  return Boolean(redisClient && isConnected);
}

module.exports = {
  getCache,
  setCache,
  delCache,
  delCachePattern,
  isRedisAvailable,
  getRedisClient: () => redisClient
};
