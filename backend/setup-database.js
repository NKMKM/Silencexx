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

async function checkAndCreateTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Проверяем существующие таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    const existingTables = tablesResult.rows.map(r => r.table_name);
    console.log('📋 Existing tables:', existingTables);
    
    const requiredTables = [
      'user_description',
      'roles', 
      'session',
      'users',
      'language',
      'user_default_settings',
      'settings',
      'chat_id',
      'user_chat',
      'ai_response',
      'diary'
    ];
    
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables);
      console.log('\n🔄 Creating missing tables from 1.sql...\n');
      
      const fs = require('fs');
      const path = require('path');
      const schema = fs.readFileSync(
        path.join(__dirname, 'flyway', '1.sql'),
        'utf8'
      );
      
      await client.query(schema);
      console.log('✅ All tables created successfully!\n');
    } else {
      console.log('\n✅ All required tables exist!\n');
    }
    
    // Проверяем колонку password в session
    const passwordColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'session' AND column_name = 'password';
    `);
    
    if (passwordColumn.rows.length === 0) {
      console.log('🔄 Adding password column to session table...');
      await client.query('ALTER TABLE session ADD COLUMN password VARCHAR(255);');
      console.log('✅ Password column added!\n');
    } else {
      console.log('✅ Password column exists in session table\n');
    }
    
    // Показываем финальный список таблиц
    const finalTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📊 Database ready with tables:');
    finalTables.rows.forEach(t => console.log(`  ✓ ${t.table_name}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndCreateTables();
