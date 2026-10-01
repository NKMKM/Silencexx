const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up database...\n');
    
    // Удаляем существующие таблицы в правильном порядке
    console.log('🗑️  Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS diary CASCADE;
      DROP TABLE IF EXISTS ai_response CASCADE;
      DROP TABLE IF EXISTS user_chat CASCADE;
      DROP TABLE IF EXISTS chat_id CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS session CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS user_description CASCADE;
      DROP TABLE IF EXISTS user_default_settings CASCADE;
      DROP TABLE IF EXISTS language CASCADE;
    `);
    
    console.log('✅ Tables dropped\n');
    
    // Читаем и выполняем 1.sql
    const fs = require('fs');
    const path = require('path');
    const sql1 = fs.readFileSync(path.join(__dirname, 'flyway', '1.sql'), 'utf8');
    
    console.log('📄 Running 1.sql...');
    await client.query(sql1);
    console.log('✅ 1.sql completed\n');
    
    // Выполняем 2.sql
    const sql2 = fs.readFileSync(path.join(__dirname, 'flyway', '2.sql'), 'utf8');
    console.log('📄 Running 2.sql...');
    await client.query(sql2);
    console.log('✅ 2.sql completed\n');
    
    // Выполняем 3.sql
    const sql3 = fs.readFileSync(path.join(__dirname, 'flyway', '3.sql'), 'utf8');
    console.log('📄 Running 3.sql...');
    await client.query(sql3);
    console.log('✅ 3.sql completed\n');
    
    // Выполняем 4.sql
    const sql4 = fs.readFileSync(path.join(__dirname, 'flyway', '4.sql'), 'utf8');
    console.log('📄 Running 4.sql...');
    await client.query(sql4);
    console.log('✅ 4.sql completed\n');
    
    // Выполняем 5.sql
    const sql5 = fs.readFileSync(path.join(__dirname, 'flyway', '5.sql'), 'utf8');
    console.log('📄 Running 5.sql...');
    await client.query(sql5);
    console.log('✅ 5.sql completed\n');
    
    // Выполняем 6.sql
    const sql6 = fs.readFileSync(path.join(__dirname, 'flyway', '6.sql'), 'utf8');
    console.log('📄 Running 6.sql...');
    await client.query(sql6);
    console.log('✅ 6.sql completed\n');
    
    // Проверяем результат
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    console.log('\n✅ Database setup completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
