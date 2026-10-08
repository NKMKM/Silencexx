import { Request, Response } from 'express';
import { pool } from './db';
import { verifyToken } from './auth';
import { generateDailyWish } from './ai';

let schemaReady: Promise<unknown> | undefined;
const pending = new Map<string, Promise<string>>();
export async function getDailyWish(req: Request, res: Response) {
  let userId: number;
  try { userId = verifyToken(req.headers.authorization?.replace(/^Bearer /, '') || '').userId; }
  catch { return res.status(401).json({ success: false, error: 'Unauthorized' }); }
  const language = req.query.language;
  const offset = Number(req.query.offset ?? 0);
  if ((language !== 'ru' && language !== 'en') || !Number.isInteger(offset) || offset < -840 || offset > 840) {
    return res.status(400).json({ success: false, error: 'Invalid language or UTC offset' });
  }
  const day = new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
  try {
    if (!schemaReady) schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS daily_wishes (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      language VARCHAR(2) NOT NULL, day DATE NOT NULL, wish TEXT NOT NULL,
      PRIMARY KEY (user_id, language, day)
    )`).catch(error => { schemaReady = undefined; throw error; });
    await schemaReady;
    const params = [userId, language, day];
    const select = 'SELECT wish FROM daily_wishes WHERE user_id=$1 AND language=$2 AND day=$3';
    const cached = await pool.query(select, params);
    if (cached.rows.length) return res.json({ success: true, wish: cached.rows[0].wish, day, language });
    const key = `${userId}:${language}:${day}`;
    let generation = pending.get(key);
    if (!generation) {
      // No DB connection is held while waiting for the API and its usage ledger.
      generation = (async () => {
        const wish = await generateDailyWish(language);
        await pool.query('INSERT INTO daily_wishes (user_id,language,day,wish) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [...params, wish]);
        // Across server instances, the first persisted response remains the wish for this day.
        return (await pool.query(select, params)).rows[0].wish as string;
      })();
      pending.set(key, generation);
    }
    let wish: string;
    try { wish = await generation; }
    finally { if (pending.get(key) === generation) pending.delete(key); }
    return res.json({ success: true, wish, day, language });
  } catch (error) {
    console.error('Daily wish failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(503).json({ success: false, error: 'Daily wish temporarily unavailable' });
  }
}
