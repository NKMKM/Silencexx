const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Для Aiven Cloud
  }
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Подключение к базе данных...');
    
    // Проверяем подключение
    const result = await client.query('SELECT NOW()');
    console.log('✅ Подключено:', result.rows[0].now);
    
    console.log('🔄 Проверка существующих таблиц...');
    
    // Проверяем существующие таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Существующие таблицы:', tablesResult.rows.map(r => r.table_name));
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  Таблицы не найдены. Нужно создать их вручную используя 1.sql');
      console.log('💡 Совет: Используйте pgAdmin или psql для выполнения 1.sql');
    } else {
      console.log('✅ База данных готова к работе!');
      
      // Проверяем количество пользователей
      const usersCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`👥 Пользователей в базе: ${usersCount.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
