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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running migration 2.sql...\n');
    
    // Читаем файл миграции
    const fs = require('fs');
    const path = require('path');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'flyway', '2.sql'),
      'utf8'
    );
    
    // Выполняем миграцию
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Проверяем результат
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Session table columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Column "password" already exists. Migration already applied.');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
