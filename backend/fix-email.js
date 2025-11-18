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

async function fixEmail() {
  try {
    console.log('🔧 Fixing email typo in database...\n');
    
    // Показать текущее состояние
    const before = await pool.query(`
      SELECT id, name, email
      FROM user_description
      WHERE email LIKE '%@gmail.con'
    `);
    
    if (before.rows.length === 0) {
      console.log('✅ No emails with .con found');
      return;
    }
    
    console.log('📋 Before fix:');
    before.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.name} - ${row.email}`);
    });
    
    // Исправить
    const result = await pool.query(`
      UPDATE user_description
      SET email = REPLACE(email, '@gmail.con', '@gmail.com')
      WHERE email LIKE '%@gmail.con'
      RETURNING id, name, email
    `);
    
    console.log('\n✅ Fixed emails:');
    result.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.name} - ${row.email}`);
    });
    
    console.log(`\n🎉 Fixed ${result.rows.length} email(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixEmail();
