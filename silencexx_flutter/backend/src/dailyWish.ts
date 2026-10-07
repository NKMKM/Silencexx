import { Request, Response } from 'express';
import { pool } from './db';
import { verifyToken } from './auth';
import { generateDailyWish } from './ai';

// Persist separately per account, language and local day; repetitions are allowed.
let schemaReady: Promise<unknown> | undefined;
export async function getDailyWish(req: Request, res: Response) {
  let userId: number;
  try {
    userId = verifyToken(req.headers.authorization?.replace(/^Bearer /, '') || '').userId;
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const language = req.query.language;
  const offset = Number(req.query.offset ?? 0);
  if ((language !== 'ru' && language !== 'en') || !Number.isInteger(offset) || offset < -840 || offset > 840) {
    return res.status(400).json({ success: false, error: 'Invalid language or UTC offset' });
  }
  const day = new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
  try {
    if (!schemaReady) {
      schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS daily_wishes (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(2) NOT NULL,
        day DATE NOT NULL,
        wish TEXT NOT NULL,
        PRIMARY KEY (user_id, language, day)
      )`).catch(error => { schemaReady = undefined; throw error; });
    }
    await schemaReady;
    const cached = await pool.query('SELECT wish FROM daily_wishes WHERE user_id=$1 AND language=$2 AND day=$3', [userId, language, day]);
    if (cached.rows.length) return res.json({ success: true, wish: cached.rows[0].wish, day, language });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize generation even when several server processes receive the same request.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`wish:${userId}:${language}:${day}`]);
      const existing = await client.query('SELECT wish FROM daily_wishes WHERE user_id=$1 AND language=$2 AND day=$3', [userId, language, day]);
      const wish = existing.rows[0]?.wish ?? await generateDailyWish(language);
      if (!existing.rows.length) await client.query('INSERT INTO daily_wishes (user_id, language, day, wish) VALUES ($1,$2,$3,$4)', [userId, language, day, wish]);
      await client.query('COMMIT');
      return res.json({ success: true, wish, day, language });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } catch (error) {
    console.error('Daily wish failed:', error);
    return res.status(503).json({ success: false, error: 'Daily wish temporarily unavailable' });
  }
}
