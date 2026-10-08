#!/usr/bin/env node
require('dotenv').config();
const {Pool} = require('pg');
const pool = new Pool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT || 5432),database:process.env.DB_NAME || 'cloudmind',user:process.env.DB_USER || 'postgres',password:process.env.DB_PASSWORD,ssl:process.env.DB_HOST?.includes('aivencloud.com')?{rejectUnauthorized:false}:false});
(async () => {
 try {
  const days=Number(process.argv[2] || 30);
  if (!Number.isInteger(days)||days<1||days>366) throw new Error('days must be 1..366');
  const result=await pool.query(`SELECT user_id,feature,model,COUNT(*) AS requests,
   COUNT(*) FILTER(WHERE status='cached') AS cache_hits,
   COUNT(*) FILTER(WHERE estimated_cost_usd IS NULL) AS unreconciled_calls,
   SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens,
   SUM(cached_input_tokens) AS cached_input_tokens,SUM(reasoning_tokens) AS reasoning_tokens,
   SUM(served_output_tokens) AS served_output_tokens,SUM(estimated_cost_usd) AS known_estimated_cost_usd
   FROM ai_usage WHERE created_at>=NOW()-($1::int*INTERVAL '1 day') GROUP BY user_id,feature,model ORDER BY user_id,feature`,[days]);
  console.log(JSON.stringify({currency:'USD',days,note:'Known estimated cost excludes unknown billing; reconcile Model Studio invoice.',usage:result.rows},null,2));
 } catch(e) {console.error(e.message);process.exitCode=1;}
 finally {await pool.end();}
})();
