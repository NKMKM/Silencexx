#!/usr/bin/env node
// Read-only DB inspection. No migrations, user content, API keys or passwords in the report.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

const expected = {
  users: ['id', 'user_desc_id', 'user_role', 'session_id', 'subscription_tier_id', 'subscription_expires_at'],
  user_description: ['id', 'name', 'email', 'registration', 'avatar'],
  user_credentials: ['user_id', 'password_hash'],
  session: ['id', 'user_id', 'session_ip', 'session_key', 'device_type', 'is_active', 'created_at', 'last_active'],
  roles: ['id', 'role', 'till', 'autorefresh'],
  settings: ['user_id', 'theme', 'language_id'],
  chat_id: ['id', 'user_id', 'is_temporary', 'is_first_message', 'created_at', 'updated_at'],
  user_chat: ['id', 'chat_id', 'user_id', 'message', 'senddate'],
  ai_response: ['id', 'chat_id', 'user_id', 'message', 'senddate'],
  messages: ['id', 'chat_id', 'user_id', 'role', 'type', 'text', 'audio_url', 'status'],
  diary: ['id', 'user_id', 'diary_date', 'diary_content'],
  daily_limits: ['user_id', 'reset_date', 'chat_requests_used', 'voice_messages_used', 'mood_analysis_used', 'journal_entries_used'],
  subscription_tiers: ['id', 'slug', 'daily_chat_limit', 'daily_voice_limit', 'daily_mood_analysis_limit', 'daily_journal_limit'],
  daily_tasks: ['id', 'user_id', 'status', 'created_at', 'completed_at'],
  user_streaks: ['user_id', 'current_streak', 'longest_streak', 'last_completed_at'],
  anonymous_messages: ['id', 'sender_id', 'receiver_id', 'message', 'is_read'],
  password_reset_tokens: ['id', 'user_id', 'token', 'expires_at', 'used_at'],
  email_change_requests: ['id', 'user_id', 'new_email', 'verification_token', 'expires_at', 'verified_at'],
};

async function main() {
  const missing = ['DB_HOST', 'DB_NAME', 'DB_USER'].filter(key => !process.env[key]);
  if (missing.length) {
    console.error(`DB configuration missing: ${missing.join(', ')}. Set these in this backend's .env; add DB_PORT and DB_PASSWORD as required.`);
    process.exitCode = 1;
    return;
  }
  const host = process.env.DB_HOST;
  const ssl = host.includes('aivencloud.com') ? {
    rejectUnauthorized: true,
    ...(process.env.DB_SSL_CA_FILE ? { ca: fs.readFileSync(process.env.DB_SSL_CA_FILE, 'utf8') } : {}),
  } : false;
  const pool = new Pool({ host, port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD || '',
    ssl, max: 1, connectionTimeoutMillis: 6000, statement_timeout: 5000, query_timeout: 6000 });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    const report = { checkedAt: new Date().toISOString(), readOnly: true, findings: [], plans: {} };
    report.server = (await client.query(`SELECT current_setting('server_version') AS version,
      current_setting('TimeZone') AS timezone, current_setting('transaction_read_only') AS read_only,
      (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS role_is_superuser,
      (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls`)).rows[0];
    report.columns = (await client.query(`SELECT table_name,column_name,data_type,is_nullable
      FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
    report.indexes = (await client.query(`SELECT tablename,indexname,indexdef FROM pg_indexes
      WHERE schemaname='public' ORDER BY tablename,indexname`)).rows;
    report.constraints = (await client.query(`SELECT c.relname AS table_name, con.contype AS type,
      pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con
      JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' ORDER BY c.relname,con.conname`)).rows;
    report.statistics = (await client.query(`SELECT relname,n_live_tup,n_dead_tup,seq_scan,idx_scan,
      last_autoanalyze,last_autovacuum FROM pg_stat_user_tables ORDER BY relname`)).rows;
    const columns = new Map();
    for (const row of report.columns) {
      if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
      columns.get(row.table_name).add(row.column_name);
    }
    for (const [table, required] of Object.entries(expected)) {
      for (const column of required) if (!columns.get(table)?.has(column)) report.findings.push(`Missing ${table}.${column}`);
    }
    if (report.server.role_is_superuser) report.findings.push('Application DB role is a superuser; use a restricted application role.');
    if (!['UTC', 'GMT', 'Etc/UTC', 'Etc/GMT'].includes(report.server.timezone)) report.findings.push('DB timezone is not UTC; CURRENT_DATE quotas depend on DB timezone.');
    // EXPLAIN only: validates SQL and shows the planner estimate, without executing the SELECT.
    // IDs are placeholders, so these are NOT measured production latency or representative row counts.
    const statements = {
      session: ['SELECT id FROM session WHERE id=$1 AND user_id=$2 AND is_active=true', [0, 0]],
      diary: ["SELECT id,diary_date,diary_content FROM diary WHERE user_id=$1 AND diary_date >= $2::date AND diary_date < $2::date + INTERVAL '1 day'", [0, '2026-10-08']],
      chatList: [`SELECT c.id,c.user_id,COALESCE(lpc.message,'') AS last_message,
        COALESCE(lpc.senddate,c.created_at) AS last_message_date FROM chat_id c
        LEFT JOIN LATERAL (SELECT message,senddate FROM (
          (SELECT text AS message,created_at AS senddate FROM messages WHERE chat_id=c.id AND user_id=c.user_id ORDER BY created_at DESC LIMIT 1)
          UNION ALL (SELECT message,senddate FROM user_chat WHERE chat_id=c.id ORDER BY senddate DESC LIMIT 1)
          UNION ALL (SELECT message,senddate FROM ai_response WHERE chat_id=c.id ORDER BY senddate DESC LIMIT 1)
        ) recent ORDER BY senddate DESC LIMIT 1) lpc ON true
        WHERE c.user_id=$1 AND (c.is_temporary=false OR c.is_temporary IS NULL)
        ORDER BY last_message_date DESC LIMIT 50`, [0]],
      audio: ['SELECT 1 FROM messages WHERE user_id=$1 AND audio_url=$2 LIMIT 1', [0, 'uploads/audit-placeholder']],
    };
    for (const [name, [sql, values]] of Object.entries(statements)) {
      await client.query('SAVEPOINT audit_query');
      try { report.plans[name] = (await client.query('EXPLAIN (FORMAT JSON) ' + sql, values)).rows[0]['QUERY PLAN']; }
      catch (error) {
        report.findings.push(`SQL ${name} failed (${error.code || 'UNKNOWN'}).`);
        await client.query('ROLLBACK TO SAVEPOINT audit_query');
      }
      await client.query('RELEASE SAVEPOINT audit_query');
    }
    // Optional bounded SELECT execution: aggregate counts and plans only, never user content.
    if (process.argv.includes('--analyze')) {
      report.integrity = {};
      const checks = {
        duplicateEmailGroups: `SELECT count(*)::int AS count FROM (SELECT lower(email) FROM user_description WHERE email IS NOT NULL GROUP BY lower(email) HAVING count(*)>1) d`,
        orphanSessions: `SELECT count(*)::int AS count FROM session s LEFT JOIN users u ON u.id=s.user_id WHERE u.id IS NULL`,
        invalidMessageOwners: `SELECT count(*)::int AS count FROM messages m LEFT JOIN chat_id c ON c.id=m.chat_id WHERE c.id IS NULL OR m.user_id IS DISTINCT FROM c.user_id`,
        invalidLegacyUserOwners: `SELECT count(*)::int AS count FROM user_chat m LEFT JOIN chat_id c ON c.id=m.chat_id WHERE c.id IS NULL OR m.user_id IS DISTINCT FROM c.user_id`,
        invalidLegacyAssistantOwners: `SELECT count(*)::int AS count FROM ai_response m LEFT JOIN chat_id c ON c.id=m.chat_id WHERE c.id IS NULL OR m.user_id IS DISTINCT FROM c.user_id`,
        duplicateDiaryDays: `SELECT count(*)::int AS count FROM (SELECT user_id,diary_date::date FROM diary GROUP BY user_id,diary_date::date HAVING count(*)>1) d`,
        duplicateQuotaDays: `SELECT count(*)::int AS count FROM (SELECT user_id,reset_date FROM daily_limits GROUP BY user_id,reset_date HAVING count(*)>1) d`,
      };
      for (const [name, sql] of Object.entries(checks)) {
        await client.query('SAVEPOINT integrity_check');
        try {
          const count = (await client.query(sql)).rows[0].count;
          report.integrity[name] = count;
          if (count) report.findings.push(`Integrity ${name}: ${count}; inspect before changing data.`);
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT integrity_check');
          report.findings.push(`Integrity ${name} failed (${error.code || 'UNKNOWN'}).`);
        }
        await client.query('RELEASE SAVEPOINT integrity_check');
      }
      report.roundTripMs = [];
      for (let i=0; i<5; i++) {
        const start = process.hrtime.bigint();
        await client.query('SELECT 1');
        report.roundTripMs.push(Number(process.hrtime.bigint()-start)/1e6);
      }
      // Largest chat owner makes the list sample useful; identity stays out of the report.
      const sample = (await client.query('SELECT user_id FROM chat_id GROUP BY user_id ORDER BY count(*) DESC LIMIT 1')).rows[0];
      if (sample) {
        report.measuredPlans = {};
        const measured = {
          chatList: [statements.chatList[0], [sample.user_id]],
          history: [`SELECT id,role,text,created_at FROM messages WHERE user_id=$1 AND chat_id=(SELECT id FROM chat_id WHERE user_id=$1 ORDER BY updated_at DESC NULLS LAST LIMIT 1) ORDER BY created_at`, [sample.user_id]],
        };
        for (const [name,[sql,values]] of Object.entries(measured)) {
          await client.query('SAVEPOINT measured_query');
          try {
            const plan = (await client.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) '+sql,values)).rows[0]['QUERY PLAN'][0];
            // Full plans can include literal account IDs; retain timings/counts only.
            report.measuredPlans[name] = { planningMs: plan['Planning Time'], executionMs: plan['Execution Time'], rows: plan.Plan['Actual Rows'] };
          } catch (error) {
            await client.query('ROLLBACK TO SAVEPOINT measured_query');
            report.findings.push(`Measured ${name} failed (${error.code || 'UNKNOWN'}).`);
          }
          await client.query('RELEASE SAVEPOINT measured_query');
        }
      }
    }
    await client.query('ROLLBACK');
    const directory = path.join(__dirname, '../.db-audit');
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(directory, 'latest.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(`DB inspected: ${columns.size} tables, ${report.indexes.length} indexes; ${report.findings.length} findings.`);
    for (const finding of report.findings) console.log('- ' + finding);
    console.log('Read-only report: .db-audit/latest.json. No table data was changed. Only measuredPlans contains server execution timings; plans contains estimates.');
    if (report.findings.length) process.exitCode = 2;
  } catch (error) {
    console.error(`DB inspection failed (${error.code || error.name || 'UNKNOWN'}). Credentials and server error details omitted.`);
    process.exitCode = 1;
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    await pool.end();
  }
}
main().catch(error => { console.error(`DB checker setup failed (${error.code || error.name || 'UNKNOWN'}).`); process.exitCode = 1; });
