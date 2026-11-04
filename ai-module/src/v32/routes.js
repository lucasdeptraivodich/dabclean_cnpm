'use strict';
const path=require('path');
const {createRouter}=require('../v3/routes');
const {runAnalysis}=require('../v3/engine');
const {CRITERIA}=require('./provider');
module.exports.createV32Router=()=>createRouter({version:'3.2',enabledEnv:'AI_V32_ENABLED',providerEnv:'AI_V32_PROVIDER',defaultProvider:'9router',allowedProviders:['9router'],capabilities:{criteria:CRITERIA,scoreStatus:'experimental_unvalidated',localOnly:false},run:(files,options)=>{
  return runAnalysis(files,{...options,timeoutMs:780000,workerPath:path.join(__dirname,'worker.js')});
}});
