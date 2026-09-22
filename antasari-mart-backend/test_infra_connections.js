require('dotenv').config();
const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');
const https = require('https');

async function testPostgres() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432');
  const database = process.env.DB_NAME || 'Antasari_Mart';
  const user = process.env.DB_USER || 'postgres';
  const pass = process.env.DB_PASS || '';
  const isRemote = host && !['localhost', '127.0.0.1'].includes(host.toLowerCase());

  console.log('\n--- 🐘 1. PENGUJIAN POSTGRESQL ---');
  console.log(`Host     : ${host}:${port}`);
  console.log(`Database : ${database}`);
  console.log(`User     : ${user}`);

  const start = Date.now();
  const sequelize = new Sequelize(database, user, pass, {
    host,
    port,
    dialect: 'postgres',
    logging: false,
    dialectOptions: isRemote ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  });

  try {
    await sequelize.authenticate();
    const duration = Date.now() - start;
    console.log(`✅ [PostgreSQL] BERHASIL TERHUBUNG! (Latency: ${duration}ms)`);
    
    // Test simple query
    const [results] = await sequelize.query('SELECT current_database(), current_user, version();');
    console.log(`   Database Aktif : ${results[0].current_database}`);
    console.log(`   User Aktif     : ${results[0].current_user}`);
    console.log(`   Versi Engine   : ${results[0].version.split(',')[0]}`);
    await sequelize.close();
    return { ok: true, duration };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ [PostgreSQL] GAGAL TERHUBUNG! (${duration}ms):`, err.message);
    return { ok: false, error: err.message };
  }
}

async function testMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Antasari_Mart_Chat';
  console.log('\n--- 🍃 2. PENGUJIAN MONGODB ---');
  // Mask password if any
  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`URI : ${maskedUri}`);

  const start = Date.now();
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    const duration = Date.now() - start;
    console.log(`✅ [MongoDB] BERHASIL TERHUBUNG! (Latency: ${duration}ms)`);
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();
    console.log(`   Versi MongoDB  : ${serverStatus.version}`);
    console.log(`   Host Server    : ${serverStatus.host}`);
    console.log(`   Uptime         : ${Math.round(serverStatus.uptime / 60)} menit`);
    await mongoose.disconnect();
    return { ok: true, duration };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`❌ [MongoDB] GAGAL TERHUBUNG! (${duration}ms):`, err.message);
    return { ok: false, error: err.message };
  }
}

async function testRedisUpstash() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || 'https://liked-starling-84190.upstash.io';
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || 'gQAAAAAAAUjeAAIgcDFmMDhjZDBjZjY4M2I0N2Y4YjdhYWUxNGVmYzA0N2I0NA';

  console.log('\n--- ⚡ 3. PENGUJIAN REDIS (UPSTASH CLOUD REST) ---');
  console.log(`Endpoint : ${redisUrl}`);

  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(`${redisUrl}/ping`);
      const req = https.request({
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${redisToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          const duration = Date.now() - start;
          if (res.statusCode === 200) {
            console.log(`✅ [Redis Upstash] BERHASIL TERHUBUNG! (PING -> ${body.trim()}, Latency: ${duration}ms)`);
            resolve({ ok: true, duration, response: body.trim() });
          } else {
            console.error(`❌ [Redis Upstash] Response status: ${res.statusCode}, Body: ${body}`);
            resolve({ ok: false, error: `Status ${res.statusCode}: ${body}` });
          }
        });
      });

      req.on('error', (e) => {
        const duration = Date.now() - start;
        console.error(`❌ [Redis Upstash] GAGAL TERHUBUNG! (${duration}ms):`, e.message);
        resolve({ ok: false, error: e.message });
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('❌ [Redis Upstash] Request Timeout!');
        resolve({ ok: false, error: 'Timeout' });
      });

      req.end();
    } catch (err) {
      console.error('❌ [Redis Upstash] Gagal membuat request:', err.message);
      resolve({ ok: false, error: err.message });
    }
  });
}

async function runAll() {
  console.log('====================================================');
  console.log('🔍 AUDIT & PENGUJIAN KONEKSI INFRASTRUKTUR BACKEND');
  console.log('====================================================');
  
  const pgRes = await testPostgres();
  const mongoRes = await testMongo();
  const redisRes = await testRedisUpstash();

  console.log('\n====================================================');
  console.log('📊 RINGKASAN HASIL AUDIT KONEKSI');
  console.log('====================================================');
  console.log(`1. PostgreSQL : ${pgRes.ok ? '🟢 AKTIF & SIAP PAKAI' : '🔴 GAGAL / NONAKTIF'}`);
  console.log(`2. MongoDB    : ${mongoRes.ok ? '🟢 AKTIF & SIAP PAKAI' : '🟡 NONAKTIF (Auto fallback ke PostgreSQL)'}`);
  console.log(`3. Redis Cloud: ${redisRes.ok ? '🟢 AKTIF & SIAP PAKAI' : '🔴 GAGAL / PERLU DIPERIKSA'}`);
  console.log('====================================================\n');
  process.exit(0);
}

runAll();
