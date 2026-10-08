#!/usr/bin/env node
// Idempotent recovery of DB updates after a successful paid call. Keep the spool for audit.
require('ts-node/register');
require('dotenv').config();
const fs=require('fs');
const path=require('path');
const {finishUsage}=require('../src/aiUsage');
const {pool}=require('../src/db');
(async()=>{
 try {
  const filename=path.join(__dirname,'../.ai-usage/recovery.ndjson');
  if (!fs.existsSync(filename)) {console.log('No recovery records');return;}
  // Snapshot first: finishUsage can append a fresh retry if DB remains unavailable.
  const records=fs.readFileSync(filename,'utf8').split('\n').filter(Boolean);
  for(const line of records){const {id,...outcome}=JSON.parse(line);await finishUsage(id,outcome);}
  console.log(`Processed ${records.length} recovery records; verify no pending rows remain using usage-report.js.`);
 } catch(e){console.error(e.message);process.exitCode=1;}
 finally {await pool.end();}
})();
