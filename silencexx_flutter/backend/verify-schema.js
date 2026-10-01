const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('user_chat', 'ai_response')
      ORDER BY table_name, ordinal_position;
    `);
    console.log('\n✅ Database schema:');
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n📋 ${row.table_name}:`);
        currentTable = row.table_name;
      }
      const highlight = row.column_name === 'audio_uri' ? '🎙️' : '  ';
      console.log(`${highlight} ${row.column_name} (${row.data_type})`);
    });
    console.log('\n✅ Verification complete!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
