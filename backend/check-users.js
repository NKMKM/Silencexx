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

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const result = await pool.query(`
      SELECT 
        u.id,
        ud.name,
        ud.email,
        ud.phone,
        s.id as session_id,
        s.password IS NOT NULL as has_password,
        LENGTH(s.password) as password_length
      FROM users u
      JOIN user_description ud ON u.user_desc_id = ud.id
      JOIN session s ON u.session_id = s.id
      ORDER BY u.id
    `);
    
    console.log('📊 Users found:', result.rows.length);
    console.log('\n');
    
    result.rows.forEach(user => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 User ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Session ID: ${user.session_id}`);
      console.log(`   Has Password: ${user.has_password ? '✅' : '❌'}`);
      console.log(`   Password Length: ${user.password_length || 0}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
