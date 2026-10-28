import { query, pool } from './db';

export interface ConversationRow {
  id: string; source: string; role: string; text: string; created_at: string | Date;
  [key: string]: any;
}
/** Reconcile historical dual writes, one-to-one. Never collapse repetitions within one source. */
export function reconcileHistory(rows: ConversationRow[]): ConversationRow[] {
  const modern = rows.filter(row => row.source === 'messages');
  const legacy = rows.filter(row => row.source !== 'messages');
  const matched = new Set<ConversationRow>();
  for (const row of modern) {
    const candidates = legacy.filter(old => !matched.has(old) && old.role === row.role && old.text === row.text &&
      Math.abs(new Date(old.created_at).getTime() - new Date(row.created_at).getTime()) <= 60_000);
    candidates.sort((a,b) => Math.abs(+new Date(a.created_at)- +new Date(row.created_at)) - Math.abs(+new Date(b.created_at)- +new Date(row.created_at)));
    if (candidates[0]) matched.add(candidates[0]);
  }
  return [...modern, ...legacy.filter(row => !matched.has(row))]
    .sort((a,b) => +new Date(a.created_at) - +new Date(b.created_at) ||
      (a.role === b.role ? String(a.id).localeCompare(String(b.id), undefined, {numeric:true}) : a.role === 'user' ? -1 : 1))
    .map(row => ({ ...row, id: `${row.source}:${row.id}` }));
}
export async function readConversation(chatId: number, userId: number): Promise<ConversationRow[]> {
  const result = await query(`
    SELECT id::text, 'messages' AS source, chat_id, role, type, text, audio_url, status, created_at, to_jsonb(messages)->>'voice_emotion' AS voice_emotion
    FROM messages WHERE chat_id=$1 AND user_id=$2
    UNION ALL
    SELECT id::text, 'user_chat' AS source, chat_id,
      CASE WHEN to_jsonb(legacy)->>'is_ai_response'='true' THEN 'assistant' ELSE 'user' END AS role,
      'text' AS type, message AS text, NULL AS audio_url, 'ready' AS status, senddate AS created_at, NULL::text AS voice_emotion
    FROM user_chat legacy WHERE chat_id=$1 AND user_id=$2
    UNION ALL
    SELECT id::text, 'ai_response' AS source, chat_id, 'assistant' AS role,
      'text' AS type, message AS text, NULL AS audio_url, 'ready' AS status, senddate AS created_at, NULL::text AS voice_emotion
    FROM ai_response WHERE chat_id=$1 AND user_id=$2
    ORDER BY created_at ASC`, [chatId,userId]);
  return reconcileHistory(result.rows);
}

export async function saveConversationTurn(chatId: number, userId: number, text: string, answer: string, audioUrl?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owner = await client.query('SELECT id FROM chat_id WHERE id=$1 AND user_id=$2 FOR UPDATE', [chatId,userId]);
    if (!owner.rows.length) throw new Error('Chat no longer available');
    // Both rows commit together; new turns have exactly one authoritative storage location.
    await client.query(`INSERT INTO messages (chat_id,user_id,role,type,text,audio_url,status,created_at)
      VALUES ($1,$2,'user',$3,$4,$5,'ready',clock_timestamp()),
             ($1,$2,'assistant','text',$6,NULL,'ready',clock_timestamp())`,
      [chatId,userId,audioUrl ? 'voice' : 'text',text,audioUrl || null,answer]);
    await client.query('UPDATE chat_id SET is_first_message=false,updated_at=NOW() WHERE id=$1 AND user_id=$2', [chatId,userId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
