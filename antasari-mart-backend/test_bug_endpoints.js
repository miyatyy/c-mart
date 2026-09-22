require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

async function testBugReport() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432');
  const database = process.env.DB_NAME || 'Antasari_Mart';
  const user = process.env.DB_USER || 'postgres';
  const pass = process.env.DB_PASS || '';
  const isRemote = host && !['localhost', '127.0.0.1'].includes(host.toLowerCase());

  console.log('--- 🧪 PENGUJIAN TABEL & MODEL BUG REPORT (POSTGRESQL) ---');
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
    console.log('✅ Connected to PostgreSQL!');

    const BugReport = sequelize.define('BugReport', {
      category: { type: DataTypes.STRING, defaultValue: 'general' },
      description: { type: DataTypes.TEXT, allowNull: false },
      deviceInfo: { type: DataTypes.TEXT, allowNull: true },
      userInfo: { type: DataTypes.TEXT, allowNull: true },
      url: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.STRING, defaultValue: 'open' }
    });

    await BugReport.sync({ alter: true });
    console.log('✅ Table "BugReports" synchronized with alter: true!');

    // Test insert
    const sample = await BugReport.create({
      category: 'ui',
      description: 'Uji coba pengiriman laporan kendala sistem developer',
      deviceInfo: JSON.stringify({ browser: 'Chrome', os: 'Windows 11' }),
      userInfo: JSON.stringify({ name: 'Raisa', email: 'raisa14@gmail.com', role: 'buyer' }),
      url: 'http://localhost:5173/',
      status: 'open'
    });
    console.log(`✅ Sample report created with ID: ${sample.id}`);

    // Test read
    const allReports = await BugReport.findAll({ limit: 5 });
    console.log(`✅ Retrieved ${allReports.length} reports from PostgreSQL.`);
    console.log(`   Sample Report Detail: [${allReports[0].category}] ${allReports[0].description}`);

    await sequelize.close();
    console.log('✅ Semua pengujian BugReport PostgreSQL sukses 100%!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during BugReport test:', err);
    process.exit(1);
  }
}

testBugReport();
