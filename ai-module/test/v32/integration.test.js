const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const sharp=require('sharp');
const fs=require('fs');
const vm=require('vm');
const {parseHTML}=require('linkedom');
const {createV32Router}=require('../../src/v32/routes');
test('real V3.2 worker: three unknown scores for dark/duplicate photos, no fake zeros',async()=>{
 const app=express();app.use('/api/ai/v3.2',createV32Router());const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try {const base=`http://127.0.0.1:${server.address().port}/api/ai/v3.2`;const cap=await (await fetch(base+'/capabilities')).json();assert.equal(Object.keys(cap.data.criteria).length,3);
 const buf=await sharp({create:{width:300,height:300,channels:3,background:'black'}}).png().toBuffer();const form=new FormData();for(let i=0;i<2;i++)form.append('images',new Blob([buf]),'dark.png');
 const response=await fetch(base+'/analyze',{method:'POST',body:form});assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.schemaVersion,'3.2');assert.equal(data.images[1].duplicateOf,1);for(const image of data.images){assert.equal(image.metrics.length,3);assert.ok(image.metrics.every(m=>m.score===null));}
 const bad=new FormData();bad.append('images',new Blob(['<svg/>']),'room.png');assert.equal((await fetch(base+'/analyze',{method:'POST',body:bad})).status,415);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('V3.2 renderer displays independent estimates safely and keeps missing score unknown',()=>{
 const {window,document}=parseHTML('<html><body><div id="result"></div></body></html>');const context=vm.createContext({window,document,URL:{revokeObjectURL(){}}});vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../../../frontend/js/ai-v3.js'),'utf8'),context);
 const evil='<img src=x onerror=alert(1)>';const result={schemaVersion:'3.2',scoreMeaning:'rubric',images:[{id:1,filename:evil,metrics:[{label:'A',status:'estimated',score:42,evidence:evil,coverage:'partial',assessedComponents:[{label:'Vết ố nhìn thấy'}],unassessedComponents:[{label:'Dấu hiệu giống mốc'}]},{label:'B',status:'insufficient_data',score:null},{label:'C',status:'estimated',score:0}]}]};const container=document.getElementById('result');window.DabCleanAiV3.render(container,result,[]);assert.equal(container.querySelectorAll('.v3-metric').length,3);assert.equal(container.querySelectorAll('[role=progressbar]').length,2);assert.equal(container.querySelector('img'),null);assert.ok(container.textContent.includes(evil));assert.ok(container.textContent.includes('42%'));assert.ok(container.textContent.includes('Phần nhìn thấy'));assert.ok(container.textContent.includes('Đã đánh giá: Vết ố nhìn thấy'));assert.ok(container.textContent.includes('Chưa đánh giá: Dấu hiệu giống mốc'));window.DabCleanAiV3.clear(container);assert.equal(container.childNodes.length,0);
});
test('9Router route reports upstream privacy honestly and skips remote inference for unusable image',async()=>{
 const old=process.env.AI_V32_PROVIDER;process.env.AI_V32_PROVIDER='9router';
 const app=express();app.use('/api/ai/v3.2',createV32Router());const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{const base=`http://127.0.0.1:${server.address().port}/api/ai/v3.2`;const cap=await(await fetch(base+'/capabilities')).json();assert.equal(cap.data.provider,'9router');assert.equal(cap.data.localOnly,false);
 const bytes=await sharp({create:{width:300,height:300,channels:3,background:'black'}}).jpeg().toBuffer();const body=new FormData();body.append('images',new Blob([bytes]),'dark.jpg');const response=await fetch(base+'/analyze',{method:'POST',body});assert.equal(response.status,200);const {data}=await response.json();assert.equal(data.privacy.inference,'9router_upstream');assert.equal(data.privacy.externalImageTransfer,false);assert.equal(data.images[0].metrics.length,3);assert.ok(data.images[0].metrics.every(m=>m.score===null));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(old===undefined)delete process.env.AI_V32_PROVIDER;else process.env.AI_V32_PROVIDER=old;}
});
