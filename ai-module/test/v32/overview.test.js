const test=require('node:test'),assert=require('node:assert/strict');
const {normalize,COMPONENTS}=require('../../src/v32/provider');
const raw=()=>({scene:'room',criteria:Object.fromEntries(Object.keys(COMPONENTS).map(k=>[k,{observable:true,ambiguous:false,coverage:'adequate',assessed_components:Object.keys(COMPONENTS[k]),score:20,evidence:'Một vài vết bám',location:'sàn',limitation:'Chỉ phần nhìn thấy'}])),overall:{level:'rat-ban',reason:'Nhiều dấu hiệu cần vệ sinh theo ba tiêu chí.'}});
test('overview comes from model, never frontend numeric thresholds',()=>{const result=normalize(raw());assert.equal(result.overall.level,'rat-ban');assert.equal(result.overall.source,'model');});
test('invalid overview is rejected and invisible scene cannot get a clean conclusion',()=>{let r=raw();r.overall.level='fake';assert.throws(()=>normalize(r));r=raw();r.scene='not_room';assert.equal(normalize(r).overall.level,'unknown');});
