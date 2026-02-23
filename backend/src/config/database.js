const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL for Supabase/Production, fallback to individual vars for local
const connectionString = process.env.DATABASE_URL;

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
