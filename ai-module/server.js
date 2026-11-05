'use strict';
const path=require('path');
require('dotenv').config({path:path.join(__dirname,'.env')});
const app=require('./src/app');
app.listen(process.env.PORT||5100,process.env.HOST||'0.0.0.0',()=>console.log('DabClean AI · 9Router · http://127.0.0.1:'+(process.env.PORT||5100)+'/v3.html'));
