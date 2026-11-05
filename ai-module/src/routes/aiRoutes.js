'use strict';
const express=require('express');
const router=express.Router();
router.use('/v3.2',require('../v32/routes').createV32Router());
router.get('/health',(req,res)=>res.json({success:true,provider:'9router',trainingEnabled:false}));
router.all(['/scan','/estimate','/model-info','/v3/*','/v3.1/*'],(req,res)=>res.status(410).json({success:false,code:'AI_ENDPOINT_RETIRED',message:'Scanner hiện chỉ dùng 9Router. Vui lòng dùng /api/ai/v3.2/analyze.'}));
module.exports=router;
