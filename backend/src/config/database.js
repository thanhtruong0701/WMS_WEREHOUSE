const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  if (!connectionString) {
    console.error('❌ CRITICAL: DATABASE_URL is missing in production/cloud environment!');
  } else {
    console.log('🌐 Using cloud database connection string');
  }
}

const poolConfig = connectionString
  ? {
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  }
  : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456Qwe@',
  };

const pool = new Pool({
  ...poolConfig,
  max: 10, // Reduced for serverless to avoid saturating Supabase connections
  idleTimeoutMillis: 10000, // Close idle clients faster in serverless
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle SQL client:', err.message);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Executed query:', { text: text.substring(0, 100), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('❌ Database Query Error:', {
      message: error.message,
      query: text.substring(0, 100),
      stack: error.stack
    });
    throw error;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
