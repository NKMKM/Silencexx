const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET='test-only-secret-not-for-deployment-1234567890';
process.env.GOOGLE_OAUTH_CLIENT_IDS='test-client';
require('ts-node/register');
const writes=[];
let queryImpl=async()=>({rows:[]});
const fakeQuery=async(sql,args)=>{writes.push({sql,args});return queryImpl(sql,args);};
const client={query:fakeQuery,release(){writes.push({sql:'RELEASE'});}};
require.cache[require.resolve('../src/db')]={exports:{query:fakeQuery,pool:{query:fakeQuery,connect:async()=>client}}};
const auth=require('../src/auth');
const jwt=require('jsonwebtoken');
const {createPayment,confirmPayment}=require('../src/payments');
const {reserveDailyLimit,getUserLimits}=require('../src/subscriptions');
const {googleAuth}=require('../src/oauth');
const response=()=>({locals:{},headersSent:false,statusCode:200,status(n){this.statusCode=n;return this;},json(body){this.body=body;this.headersSent=true;return this;}});
beforeEach(()=>{writes.length=0;queryImpl=async()=>({rows:[]});});
test('missing, malformed and identity-less tokens cannot reach protected handlers',async()=>{
 for(const token of ['', 'invalid', jwt.sign({userId:7},process.env.JWT_SECRET)]){
  const res=response();let next=false;await auth.checkSessionActive({headers:{authorization:`Bearer ${token}`}},res,()=>next=true);
  assert.equal(next,false);assert.equal(res.statusCode,401);
 }
});
test('session must belong to JWT user and remain active; DB failure fails closed',async()=>{
 const token=auth.generateToken(7,11);const req={headers:{authorization:`Bearer ${token}`}};
 let next=false;const revoked=response();await auth.checkSessionActive(req,revoked,()=>next=true);
 assert.equal(next,false);assert.equal(revoked.statusCode,401);assert.deepEqual(writes.at(-1).args,[11,7]);
 queryImpl=async()=>{throw new Error('unavailable');};const unavailable=response();await auth.checkSessionActive(req,unavailable,()=>next=true);assert.equal(unavailable.statusCode,503);assert.equal(next,false);
 queryImpl=async()=>({rows:[{id:11}]});const valid=response();await auth.checkSessionActive(req,valid,()=>next=true);assert.equal(next,true);
 const before=writes.length;await auth.checkSessionActive(req,valid,()=>{});assert.equal(writes.length,before);
});
test('old password reset and fabricated payment confirmation cannot mutate DB',async()=>{
 for(const fn of [auth.resetPassword,createPayment,confirmPayment]){
  const res=response();await fn({headers:{},body:{contact:'victim@example.test',newPassword:'Attacker1',transactionId:'fake'}},res);
  assert.ok([410,503].includes(res.statusCode));
 }
 assert.equal(writes.length,0);
});
test('phone registration is rejected before creating an unverified account',async()=>{
 const res=response();await auth.register({body:{method:'phone',contact:'+12345678901'},headers:{}},res);
 assert.equal(res.statusCode,400);assert.equal(writes.length,0);
});
test('forged OAuth identity never looks up the client-supplied victim email',async()=>{
 const res=response();await googleAuth({body:{idToken:'fabricated',email:'victim@example.test',googleId:'fake'}},res);
 assert.equal(res.statusCode,401);assert.equal(writes.length,0);
});
test('OAuth uses signed claims, rejects wrong audience and issues a new owned session',async()=>{
 const crypto=require('crypto');const axios=require('axios').default;
 const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 axios.get=async()=>({data:{keys:[{...publicKey.export({format:'jwk'}),kid:'test-key'}]}});
 const make=(aud)=>jwt.sign({sub:'provider-user',email:'owner@example.test',email_verified:true},privateKey,{algorithm:'RS256',keyid:'test-key',issuer:'https://accounts.google.com',audience:aud,expiresIn:60});
 const bad=response();await googleAuth({body:{idToken:make('wrong-client')}},bad);assert.equal(bad.statusCode,401);assert.equal(writes.length,0);
 queryImpl=async(sql)=>({rows:sql.includes('SELECT u.id')?[{id:7,email:'owner@example.test',name:'Owner'}]:sql.includes('INSERT INTO session')?[{id:22}]:[]});
 const res=response();await googleAuth({body:{idToken:make('test-client'),email:'victim@example.test'}},res);
 assert.equal(res.statusCode,200);assert.equal(res.body.user.email,'owner@example.test');assert.equal(res.body.isNewUser,false);
 assert.equal(auth.verifyToken(res.body.token).sessionId,22);
 assert.deepEqual(writes.find(x=>x.sql.startsWith('UPDATE session')).args,[7,22]);
 assert.ok(writes.some(x=>x.sql==='COMMIT'));
 writes.length=0;
 queryImpl=async(sql)=>({rows:sql.includes('SELECT u.id')?[{id:7,email:'owner@example.test',name:'Owner'}]:sql.includes('SELECT user_id FROM user_credentials')?[{user_id:7}]:[]});
 const linked=response();await googleAuth({body:{idToken:make('test-client')}},linked);
 assert.equal(linked.statusCode,409);assert.ok(!writes.some(x=>x.sql.includes('INSERT INTO session')));

});
test('consumed password reset token cannot update credentials',async()=>{
 const res=response();await auth.resetPasswordWithToken({body:{token:'a'.repeat(64),newPassword:'ValidPassword123!'}},res);
 assert.equal(res.statusCode,400);assert.ok(writes.some(x=>x.sql==='ROLLBACK'));
 assert.ok(!writes.some(x=>x.sql.includes('INSERT INTO user_credentials')));
});
test('reset failure rolls back token consumption and session revocation together',async()=>{
 queryImpl=async(sql)=>{if(sql.includes('RETURNING user_id'))return {rows:[{user_id:7}]};if(sql.includes('INSERT INTO user_credentials'))throw Error('write failed');return {rows:[]};};
 const res=response();await auth.resetPasswordWithToken({body:{token:'a'.repeat(64),newPassword:'ValidPassword123!'}},res);
 assert.equal(res.statusCode,503);assert.ok(writes.some(x=>x.sql==='ROLLBACK'));assert.equal(writes.at(-1).sql,'RELEASE');
});
test('zero quota denies admission without SQL; exhausted reservation returns false',async()=>{
 assert.equal(await reserveDailyLimit(7,'chat_requests',0),false);assert.equal(writes.length,0);
 assert.equal(await reserveDailyLimit(7,'chat_requests',5),false);
 queryImpl=async()=>({rows:[{user_id:7}]});assert.equal(await reserveDailyLimit(7,'chat_requests',5),true);
});
test('configured zero feature limit is preserved',async()=>{
 queryImpl=async()=>({rows:[{user_id:7,daily_voice_limit:0,daily_chat_limit:0,daily_chat_used:9}]});
 const limits=await getUserLimits(7);assert.equal(limits.dailyVoiceLimit,0);assert.equal(limits.dailyChatLimit,0);assert.equal(limits.dailyChatUsed,9);
});
