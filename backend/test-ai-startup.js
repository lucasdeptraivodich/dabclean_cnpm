'use strict';
// Starts the real backend entry point and an isolated loopback gateway; no standalone AI server.
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const sharp=require('../ai-module/node_modules/sharp');
const criteria={surface_clutter:['litter','clutter'],dust_grime:['dust','grime'],stains_mold:['stains','mold_like']};
const fixture={scene:'room',criteria:Object.fromEntries(Object.entries(criteria).map(([k,components],i)=>[k,{observable:true,ambiguous:false,coverage:'adequate',assessed_components:components,score:[10,30,75][i],evidence:'Dấu hiệu trong fixture kiểm thử',location:'sàn',limitation:'Chỉ kiểm tra tích hợp'}])),overall:{level:'hoi-ban',reason:'Kết luận từ model kiểm thử, không tính bằng ngưỡng frontend.'}};
(async()=>{
 let requests=0,child,output='';
 const gateway=http.createServer(async(req,res)=>{try{assert.equal(req.url,'/v1/chat/completions');let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);assert.equal(data.model,'cx/gpt-6.1-sol');assert.match(data.messages[1].content[1].image_url.url,/^data:image\/jpeg;base64,/);requests++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({model:'gpt-6.1-sol',choices:[{finish_reason:'stop',message:{content:JSON.stringify(fixture)}}]}));}catch(e){res.statusCode=500;res.end('{}');}});
 await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
 const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 try{
 child=spawn(process.execPath,['server.js'],{cwd:__dirname,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'test',DEMO_MODE:'true',JWT_SECRET:crypto.randomBytes(48).toString('hex'),AI_V32_ENABLED:'true',AI_V32_PROVIDER:'9router',AI_V32_ROUTER_URL:`http://127.0.0.1:${gateway.address().port}/v1`,AI_V32_ROUTER_MODEL:'cx/gpt-6.1-sol'}});
 child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const base=`http://127.0.0.1:${port}/api/ai`;let ready=false;
 for(let i=0;i<80;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,'Real backend entry point did not become ready');
 const health=await(await fetch(base+'/health')).json();assert.equal(health.provider,'9router');assert.equal(health.trainingEnabled,false);
 const capabilities=await(await fetch(base+'/v3.2/capabilities')).json();assert.equal(Object.keys(capabilities.data.criteria).length,3);
 const bytes=Buffer.alloc(320*240*3);let seed=17;for(let i=0;i<bytes.length;i++){seed=(seed*1664525+1013904223)>>>0;bytes[i]=30+seed%190;}
 const photo=await sharp(bytes,{raw:{width:320,height:240,channels:3}}).jpeg().toBuffer();const form=new FormData();form.append('images',new Blob([photo],{type:'image/jpeg'}),'integration-fixture.jpg');
 const response=await fetch(base+'/v3.2/analyze',{method:'POST',body:form,signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.images[0].metrics.length,3);assert.equal(data.images[0].metrics[2].score,75);assert.equal(data.overall.level,'hoi-ban');assert.equal(data.overall.source,'model');assert.equal(data.pricing.aiSurchargeApplied,false);assert.equal(requests,1);
 console.log('PASS: node server.js in backend serves scanner and model overview without starting ai-module/server.js or port 5100.');
 }finally{if(child&&child.exitCode===null){child.kill();await new Promise(r=>child.once('exit',r));}gateway.closeAllConnections();await new Promise(r=>gateway.close(r));}
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
