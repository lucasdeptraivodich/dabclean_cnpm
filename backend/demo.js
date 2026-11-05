const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
if (process.env.NODE_ENV === 'production') throw new Error('DEMO_MODE bị cấm trong production.');
process.env.NODE_ENV = 'development';
process.env.DEMO_MODE = 'true';
process.env.HOST = process.env.HOST || '0.0.0.0';
require('./server');
