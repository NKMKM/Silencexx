require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_HOST?.includes('aivencloud.com') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    const sql = fs.readFileSync('./migrations/add_tier_id.sql', 'utf-8');
    const statements = sql.split(';').filter(s => s.trim());
    
    console.log('📋 Applying add_tier_id.sql migration...\n');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      try {
        const res = await pool.query(stmt);
        console.log(`✅ [${i+1}/${statements.length}] Executed`);
      } catch(e) {
        if (e.message.includes('already exists') || e.message.includes('already defined')) {
          console.log(`⚠️ [${i+1}/${statements.length}] ${e.message.split('\n')[0]}`);
        } else {
          console.log(`❌ [${i+1}/${statements.length}] ERROR: ${e.message.split('\n')[0]}`);
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
