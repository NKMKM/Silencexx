import { randomUUID } from 'crypto';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';
import { pool } from './db';
import { config } from './config';
import { aiContext } from './aiContext';
import { verifyToken } from './auth';

export interface TokenUsage { input: number; output: number; cachedInput: number; reasoning: number; }
export interface UsageOutcome {
  status: 'success' | 'cached' | 'error' | 'unknown';
  usage?: TokenUsage; costUsd?: number; servedOutputTokens?: number;
  providerRequestId?: string; latencyMs?: number; errorCode?: string;
}
let schema: Promise<unknown> | undefined;
export function ensureUsageSchema(): Promise<unknown> {
  if (!schema) schema = pool.query(`CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY, user_id INTEGER, feature TEXT NOT NULL, model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    input_tokens BIGINT, output_tokens BIGINT, cached_input_tokens BIGINT,
    reasoning_tokens BIGINT, served_output_tokens BIGINT, estimated_cost_usd NUMERIC(20,10),
    input_price NUMERIC(14,6) NOT NULL, cached_input_price NUMERIC(14,6) NOT NULL,
    output_price NUMERIC(14,6) NOT NULL, provider_request_id TEXT, latency_ms INTEGER, error_code TEXT
  ); CREATE INDEX IF NOT EXISTS ai_usage_user_date ON ai_usage(user_id, created_at);
     CREATE INDEX IF NOT EXISTS ai_usage_date ON ai_usage(created_at);`)
    .catch(error => { schema = undefined; throw error; });
  return schema;
}
export async function beginUsage(feature: string): Promise<string> {
  await ensureUsageSchema();
  const id = randomUUID();
  await pool.query(`INSERT INTO ai_usage (id,user_id,feature,model,input_price,cached_input_price,output_price)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id, aiContext.getStore()?.userId ?? null,
    feature, config.qwenModel, config.qwenInputPrice, config.qwenCachedInputPrice, config.qwenOutputPrice]);
  return id;
}
export async function finishUsage(id: string, result: UsageOutcome): Promise<void> {
  try {
    await pool.query(`UPDATE ai_usage SET status=$2,input_tokens=$3,output_tokens=$4,cached_input_tokens=$5,
      reasoning_tokens=$6,served_output_tokens=$7,estimated_cost_usd=$8,provider_request_id=$9,
      latency_ms=$10,error_code=$11 WHERE id=$1`, [id, result.status, result.usage?.input ?? null,
      result.usage?.output ?? null, result.usage?.cachedInput ?? null, result.usage?.reasoning ?? null,
      result.servedOutputTokens ?? null, result.costUsd ?? null, result.providerRequestId ?? null,
      result.latencyMs ?? null, result.errorCode ?? null]);
  } catch {
    // Do not repeat a paid generation when only the accounting write fails.
    // No keys, prompts or responses are written here. Replay this file after DB recovery.
    const directory = path.join(__dirname, '../.ai-usage');
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await appendFile(path.join(directory, 'recovery.ndjson'), JSON.stringify({ id, ...result }) + '\n', { mode: 0o600 });
      console.error(`AI accounting deferred: ${id}`);
    } catch { console.error(`AI accounting incomplete: ${id}; reconcile with Model Studio billing`); }
  }
}

export async function getAIUsage(req: Request, res: Response) {
  let userId: number;
  try { userId = verifyToken(req.headers.authorization?.replace(/^Bearer /, '') || '').userId; }
  catch { return res.status(401).json({ success: false, error: 'Unauthorized' }); }
  const days = Number(req.query.days ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 366) return res.status(400).json({ success: false, error: 'days must be 1..366' });
  const global = req.query.scope === 'all';
  if (global && !config.aiAdminUserIds.includes(String(userId))) return res.status(403).json({ success: false, error: 'Admin only' });
  try {
    await ensureUsageSchema();
    const result = await pool.query(`SELECT feature,model,COUNT(*)::int AS requests,
      COUNT(*) FILTER (WHERE status='cached')::int AS cache_hits,
      COUNT(*) FILTER (WHERE status='success')::int AS successful_provider_calls,
      COUNT(*) FILTER (WHERE status='error')::int AS errors,
      COUNT(*) FILTER (WHERE status IN ('unknown','pending') OR estimated_cost_usd IS NULL)::int AS unreconciled_calls,
      COALESCE(SUM(input_tokens),0)::float8 AS input_tokens,
      COALESCE(SUM(output_tokens),0)::float8 AS output_tokens,
      COALESCE(SUM(cached_input_tokens),0)::float8 AS cached_input_tokens,
      COALESCE(SUM(reasoning_tokens),0)::float8 AS reasoning_tokens,
      COALESCE(SUM(served_output_tokens),0)::float8 AS served_output_tokens,
      COALESCE(SUM(estimated_cost_usd),0)::float8 AS known_estimated_cost_usd,
      AVG(latency_ms)::float8 AS average_latency_ms
      FROM ai_usage WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
      AND ($2::boolean OR user_id=$3) GROUP BY feature,model ORDER BY feature,model`, [days, global, userId]);
    return res.json({ success: true, currency: 'USD', days, scope: global ? 'all' : 'self',
      note: 'Estimated API cost; unknown/pending calls are not zero-cost. Provider invoice is authoritative. No revenue inferred.',
      usage: result.rows });
  } catch { return res.status(503).json({ success: false, error: 'Usage accounting unavailable' }); }
}
