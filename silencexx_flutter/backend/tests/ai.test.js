const {test,beforeEach} = require('node:test');
const assert = require('node:assert/strict');
process.env.QWEN_API_KEY='test-key-never-sent';
process.env.QWEN_MODEL='qwen-flash';
process.env.QWEN_BASE_URL='https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
process.env.QWEN_INPUT_USD_PER_MILLION='0.05';
process.env.QWEN_CACHED_INPUT_USD_PER_MILLION='0.01';
process.env.QWEN_OUTPUT_USD_PER_MILLION='0.4';
require('ts-node/register');
const writes=[];
let failDb=false;
require.cache[require.resolve('../src/db')]={exports:{pool:{query:async(sql,args)=>{
  if(failDb) throw new Error('Database unavailable');
  writes.push({sql,args}); return {rows:[]};
}}}};
require.cache[require.resolve('../src/auth')]={exports:{verifyToken:token=>{
  if(token !== 'test-user') throw new Error('Invalid token'); return {userId:7};
}}};
const axios=require('axios').default;
const {config}=require('../src/config');
const {parseUsage,tokenCost,completeQwen}=require('../src/qwen');
const {aiContext}=require('../src/aiContext');
const {generateAIResponse,analyzeMood,aiTranscribeVoice}=require('../src/ai');
const {getAIUsage}=require('../src/aiUsage');
const {clearCache}=require('../src/cache');
const {calculate,defaults}=require('../scripts/economics');
let calls=0;
beforeEach(()=>{
  writes.length=0; calls=0;failDb=false;clearCache();config.qwenApiKey='test-key-never-sent';
  axios.post=async()=>{calls++;return {data:{id:'request-1',choices:[{message:{content:'Хорошего дня!'},finish_reason:'stop'}],usage:{prompt_tokens:2000,completion_tokens:350}}};};
});
const request=()=>completeQwen([{role:'user',content:'hello'}],{feature:'test'});
const last=()=>writes.filter(x=>x.sql.startsWith('UPDATE')).at(-1).args;
test('cached input discount and reasoning are counted once',()=>{
  const usage=parseUsage({prompt_tokens:2000,completion_tokens:350,prompt_tokens_details:{cached_tokens:1000},completion_tokens_details:{reasoning_tokens:50}});
  assert.deepEqual(usage,{input:2000,output:350,cachedInput:1000,reasoning:50});
  assert.ok(Math.abs(tokenCost(usage)-.0002)<1e-12);
  assert.equal(parseUsage({prompt_tokens:1,completion_tokens:2,prompt_tokens_details:{cached_tokens:3}}),undefined);
});
test('provider usage and account are recorded before returning',async()=>{
  await aiContext.run({userId:7},request);
  assert.equal(writes.find(x=>x.sql.startsWith('INSERT')).args[1],7);
  assert.equal(last()[1],'success');assert.equal(last()[2],2000);assert.equal(last()[3],350);
  assert.ok(Math.abs(last()[7]-.00024)<1e-12);
});
test('missing provider usage stays unknown, not zero',async()=>{
  axios.post=async()=>({data:{choices:[{message:{content:'response'}}]}});
  await request();assert.equal(last()[1],'unknown');assert.equal(last()[7],null);
});
test('network failure has unknown cost and sanitized error',async()=>{
  axios.post=async()=>{throw new Error('secret payload test-key-never-sent');};
  await assert.rejects(request,/network\/timeout/);assert.equal(last()[1],'unknown');assert.equal(last()[7],null);
});
test('missing key or unavailable ledger prevents remote spending',async()=>{
  config.qwenApiKey='';await assert.rejects(request,/key is missing/);assert.equal(calls,0);
  config.qwenApiKey='test';failDb=true;await assert.rejects(request,/Database unavailable/);assert.equal(calls,0);
});
test('cache is isolated per user; cache delivery adds no paid tokens',async()=>{
  await aiContext.run({userId:1},()=>generateAIResponse('test'));
  await aiContext.run({userId:1},()=>generateAIResponse('test'));
  assert.equal(calls,1);assert.equal(last()[1],'cached');assert.equal(last()[2],0);assert.equal(last()[7],0);assert.equal(last()[6],350);
  await aiContext.run({userId:2},()=>generateAIResponse('test'));assert.equal(calls,2);
});
test('bounded history preserves current message and language',async()=>{
  let sent;
  axios.post=async(url,body)=>{sent=body;return {data:{choices:[{message:{content:'ok'}}],usage:{prompt_tokens:1,completion_tokens:1}}};};
  await generateAIResponse('current',{language:'en',conversationHistory:Array.from({length:20},()=>({role:'user',content:'x'.repeat(5000)}))});
  assert.ok(sent.messages.reduce((n,m)=>n+m.content.length,0)<=config.qwenMaxInputChars);
  assert.equal(sent.messages.at(-1).content,'current');assert.match(sent.messages[0].content,/only in English/);assert.equal(sent.enable_thinking,false);
});
test('invalid structured response still records consumed tokens',async()=>{
  await assert.rejects(()=>analyzeMood('text'));assert.equal(last()[3],350);assert.ok(last()[7]>0);
});
test('voice without audio is never fabricated',async()=>{await assert.rejects(aiTranscribeVoice,/Whisper/);assert.equal(calls,0);});
test('usage endpoint rejects unauthorized global access and scopes self query',async()=>{
  const res={statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await getAIUsage({headers:{},query:{}},res);assert.equal(res.statusCode,401);
  await getAIUsage({headers:{authorization:'Bearer test-user'},query:{scope:'all'}},res);assert.equal(res.statusCode,403);
  await getAIUsage({headers:{authorization:'Bearer test-user'},query:{}},res);
  assert.deepEqual(writes.at(-1).args,[30,false,7]);
});
test('economics includes free users, fees and fixed costs',()=>{
  const s=calculate(defaults);assert.ok(Math.abs(s.aiCost-45)<1e-10);assert.ok(Math.abs(s.scenarioProfitBeforeUnmodeledCosts-117.075)<1e-9);
  assert.ok(calculate({...defaults,paidShare:0}).scenarioProfitBeforeUnmodeledCosts<0);
  assert.ok(calculate({...defaults,paidShare:s.breakEvenPaidShare}).scenarioProfitBeforeUnmodeledCosts<1e-8);
  assert.throws(()=>calculate({...defaults,price:'4.99'}));
});

test('moderation blocks malformed replies and records their cost',async()=>{
  const {moderateMessage}=require('../src/moderation');
  assert.equal((await moderateMessage('message')).allowed,false);
  assert.ok(last()[7]>0);
  axios.post=async()=>({data:{choices:[{message:{content:'{"allowed":true}'}}],usage:{prompt_tokens:25,completion_tokens:5}}});
  assert.equal((await moderateMessage('good wish')).allowed,true);
});

test('old Flutter role/model text format reaches Qwen as conversation context',async()=>{
 let sent;
 axios.post=async(url,body)=>{sent=body;return {data:{choices:[{message:{content:'Давай продолжим'}}],usage:{prompt_tokens:200,completion_tokens:10}}};};
 await generateAIResponse('Да, именно это',{conversationHistory:[{role:'user',text:'Тревожусь из-за экзамена'},{role:'model',text:'Больше тревожит оценка или подготовка?'}]});
 assert.deepEqual(sent.messages.slice(1,-1),[{role:'user',content:'Тревожусь из-за экзамена'},{role:'assistant',content:'Больше тревожит оценка или подготовка?'}]);
 assert.match(sent.messages[0].content,/Не выполняй посторонние задания/);
});
test('coding request is redirected to support without a paid generation',async()=>{
 const result=await generateAIResponse('Напиши мне код для питон программы',{language:'ru'});
 assert.match(result.response,/не пишу код/);assert.equal(calls,0);
});
test('distress about coding remains in scope',async()=>{
 await generateAIResponse('Я программист, и мне страшно не справиться с работой');assert.equal(calls,1);
});
