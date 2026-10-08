const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
require('ts-node/register');
let writes=[],failWrite=false;
const client={query:async(sql,args)=>{writes.push({sql,args});if(failWrite&&sql.includes('INSERT'))throw Error('DB write failed');return {rows:sql.includes('SELECT id')?[{id:1}]:[]};},release(){writes.push({sql:'RELEASE'});}};
require.cache[require.resolve('../src/db')]={exports:{query:client.query,pool:{connect:async()=>client}}};
const {reconcileHistory,saveConversationTurn}=require('../src/conversation');
const row=(source,id,role,text,seconds)=>({source,id:String(id),role,text,created_at:new Date(1700000000000+seconds*1000)});
beforeEach(()=>{writes=[];failWrite=false;});
test('slow historical double writes render one user/assistant pair',()=>{
 const result=reconcileHistory([row('user_chat',1,'user','Привет',0),row('messages',1,'user','Привет',2),row('ai_response',1,'assistant','Рад тебя видеть',4),row('messages',2,'assistant','Рад тебя видеть',6)]);
 assert.equal(result.length,2);assert.deepEqual(result.map(x=>x.role),['user','assistant']);assert.equal(new Set(result.map(x=>x.id)).size,2);
});
test('repeated real messages and distant legacy messages are preserved',()=>{
 const result=reconcileHistory([row('user_chat',1,'user','Да',0),row('messages',1,'user','Да',2),row('messages',2,'user','Да',3),row('user_chat',2,'user','Да',200)]);
 assert.equal(result.length,3);assert.equal(result.filter(x=>x.source==='messages').length,2);
});
test('same text from different roles never collapses',()=>{
 assert.equal(reconcileHistory([row('user_chat',1,'user','Привет',0),row('messages',1,'assistant','Привет',2)]).length,2);
});
test('a turn has one transactional insert and never writes legacy mirrors',async()=>{
 await saveConversationTurn(1,7,'Как быть?','Давай обсудим.');
 assert.equal(writes.filter(x=>x.sql.includes('INSERT')).length,1);
 assert.ok(writes.some(x=>x.sql==='COMMIT'));assert.equal(writes.at(-1).sql,'RELEASE');
 assert.ok(!writes.some(x=>/INSERT INTO (user_chat|ai_response)/.test(x.sql)));
});
test('failed persistence rolls back instead of reporting success',async()=>{
 failWrite=true;await assert.rejects(()=>saveConversationTurn(1,7,'text','answer'),/DB write failed/);
 assert.ok(writes.some(x=>x.sql==='ROLLBACK'));assert.ok(!writes.some(x=>x.sql==='COMMIT'));assert.equal(writes.at(-1).sql,'RELEASE');
});
