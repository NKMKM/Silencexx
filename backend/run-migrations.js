const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database migrations...\n');
    
    // Run flyway migrations first (core schema)
    console.log('📦 Running Flyway migrations (core schema)...');
    const flywayDir = path.join(__dirname, 'flyway');
    const flywayFiles = fs.readdirSync(flywayDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of flywayFiles) {
      const sql = fs.readFileSync(path.join(flywayDir, file), 'utf-8');
      try {
        await client.query(sql);
        console.log(`  ✅ ${file}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`  ⏭️ ${file} (skipped - already exists)`);
        } else {
          console.error(`  ❌ ${file}: ${err.message}`);
        }
      }
    }
    
    // Run additional migrations
    console.log('\n📦 Running additional migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && f !== 'README.md')
      .sort();
    
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      try {
        await client.query(sql);
        console.log(`  ✅ ${file}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('constraint')) {
          console.log(`  ⏭️ ${file} (skipped - already exists or duplicate)`);
        } else {
          console.error(`  ❌ ${file}: ${err.message}`);
        }
      }
    }
    
    console.log('\n✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
