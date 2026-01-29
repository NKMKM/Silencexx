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
    console.log('🔄 Running migrations...\n');
    
    const fs = require('fs');
    const path = require('path');
    
    // 1. Индексы
    console.log('1️⃣ Adding indexes...');
    const indexesSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_indexes.sql'),
      'utf8'
    );
    await client.query(indexesSQL);
    console.log('✅ Indexes added\n');
    
    // 2. Временные чаты
    console.log('2️⃣ Adding temporary chats support...');
    const tempChatsSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_temporary_chats.sql'),
      'utf8'
    );
    await client.query(tempChatsSQL);
    console.log('✅ Temporary chats support added\n');
    
    // 3. Inbox
    console.log('3️⃣ Adding inbox support...');
    const inboxSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_inbox.sql'),
      'utf8'
    );
    await client.query(inboxSQL);
    console.log('✅ Inbox support added\n');
    
    // 4. Receive cooldown
    console.log('4️⃣ Adding receive cooldown...');
    const receiveCooldownSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_receive_cooldown.sql'),
      'utf8'
    );
    await client.query(receiveCooldownSQL);
    console.log('✅ Receive cooldown added\n');
    
    // 5. Voice messages
    console.log('5️⃣ Adding voice messages support...');
    const voiceMessagesSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_voice_messages.sql'),
      'utf8'
    );
    await client.query(voiceMessagesSQL);
    console.log('✅ Voice messages support added\n');
    
    // 6. Voice transcription and language support
    console.log('6️⃣ Adding voice transcription and language support...');
    const voiceTranscriptionSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_voice_transcription.sql'),
      'utf8'
    );
    await client.query(voiceTranscriptionSQL);
    console.log('✅ Voice transcription and language support added\n');
    
    // 7. Daily Tasks and Mood Fix
    console.log('7️⃣ Adding Daily Tasks and Mood Fix...');
    const dailyTasksSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_daily_tasks_fix.sql'),
      'utf8'
    );
    await client.query(dailyTasksSQL);
    console.log('✅ Daily Tasks and Mood Fix added\n');

    // 8. New Voice Architecture (Unified Messages)
    console.log('8️⃣  Applying new voice architecture (messages table)...');
    const newVoiceSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'update_voice_architecture.sql'),
      'utf8'
    );
    await client.query(newVoiceSQL);
    console.log('✅ New voice architecture applied\n');
    
    console.log('✅ All migrations completed successfully!\n');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Indexes already exist. Migration already applied.');
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
