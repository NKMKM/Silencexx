import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cloudmind',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10, // Уменьшаем количество соединений для Aiven
  min: 2, // Минимум активных соединений
  idleTimeoutMillis: 60000, // 60 секунд
  connectionTimeoutMillis: 10000, // 10 секунд вместо 2
  statement_timeout: 30000, // 30 секунд на выполнение запроса
  query_timeout: 30000, // 30 секунд на запрос
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: process.env.DB_HOST?.includes('aivencloud.com') ? {
    rejectUnauthorized: false
  } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // Не завершаем процесс, пул переподключится автоматически
});

// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`📊 Query executed in ${duration}ms`);
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

export default pool;
