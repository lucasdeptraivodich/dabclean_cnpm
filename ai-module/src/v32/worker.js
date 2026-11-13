'use strict';
const {parentPort}=require('worker_threads');
const {prepare}=require('../v3/quality');
const {CRITERIA}=require('./provider');
const gateway=require('./routerProvider');
const MAX_PARALLEL_ANALYSES = 3;
const unknown=(reason)=>({level:'unknown',label:'Chưa đủ dữ liệu',reason,scope:'visible_regions_only'});
parentPort.once('message',async({files})=>{
 try{
  const images=[],seen=new Map(),pending=[];
  for(const [index,file]of files.entries()){
   const prepared=await prepare(Buffer.from(file.buffer));
   const image={id:index+1,filename:file.filename,quality:prepared.quality};
   if(seen.has(prepared.hash)){image.status='duplicate';image.duplicateOf=seen.get(prepared.hash);}
   else{seen.set(prepared.hash,image.id);image.status=prepared.quality.usable?'estimated':'retake_required';}
   if(image.status==='estimated')pending.push({image,buffer:prepared.buffer});
   else{image.metrics=Object.entries(CRITERIA).map(([key,label])=>({key,label,score:null,status:'insufficient_data',evidence:'',limitation:image.duplicateOf?'Ảnh trùng, không phân tích lặp.':'Ảnh thiếu chất lượng; chụp lại rõ nét, đủ sáng.'}));image.overall=unknown('Ảnh trùng hoặc chưa đủ chất lượng.');}
   images.push(image);
  }
  for(let i=0;i<pending.length;i+=MAX_PARALLEL_ANALYSES){
   const batch=pending.slice(i,i+MAX_PARALLEL_ANALYSES);
   await Promise.all(batch.map(async({image,buffer})=>Object.assign(image,await gateway.analyze(buffer))));
  }
  const assessed=images.filter(i=>i.status==='estimated'&&i.metrics.some(m=>m.score!==null));
  let overall=assessed.length===1?assessed[0].overall:unknown('Chưa có đủ nhận định để tổng hợp.');
  if(assessed.length>1)try{overall=await gateway.summarize(assessed);}catch{overall=unknown('Đã đánh giá từng ảnh; model chưa tổng hợp được, vui lòng thử lại.');}
  parentPort.postMessage({result:{schemaVersion:'3.2',provider:'9router',experimental:true,calibrated:false,images,overall,
   scoreMeaning:'Điểm 0–100 ước tính mức độ bẩn ở phần nhìn thấy; không phải xác suất hoặc phép đo vật lý.',
   privacy:{inference:'9router_upstream',persistedImages:false,externalImageTransfer:images.some(i=>i.model?.provider==='9router'),notice:'Ảnh được gửi qua 9Router đến nhà cung cấp model; chính sách lưu dữ liệu của nhà cung cấp áp dụng riêng.'},
   aggregation:{method:'model_review_of_three_criteria',score:null,reason:'Model tổng hợp từ ba tiêu chí; không lấy trung bình các góc chụp.'},pricing:{aiSurchargeApplied:false,status:'manual_quote_required'}}});
 }catch(err){parentPort.postMessage({error:err.status?{status:err.status,code:err.code,message:err.message}:{status:503,code:'AI_UNAVAILABLE',message:'Dịch vụ AI không khả dụng. Không tạo điểm thay thế.'}});}
});
