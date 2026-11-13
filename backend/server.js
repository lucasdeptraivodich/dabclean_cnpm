// ============================================================
// DABCLEAN BACKEND - Server Entry Point
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('./src/config/startupMode')();

const app = require('./src/app');
const db = require('./src/config/db');
const PORT = process.env.PORT || 5000;

const os = require('os');

function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const lanIP = getLanIP();
const HOST = process.env.HOST || '0.0.0.0';

const http = require('http');
const { initSocket } = require('./src/services/socketService');

async function startServer() {
  try {
    await db.initDatabase();
  } catch (err) {
    const detail = err.code ? `${err.code}: ${err.message}` : err.message;
    throw new Error(`Không thể khởi tạo MySQL: ${detail}`, { cause: err });
  }
  const server = http.createServer(app);
  initSocket(server);
  server.once('error', stopStartup);
  server.listen(PORT, HOST, () => {
    console.log('====================================================');
    console.log(`  DABCLEAN BACKEND SERVER IS RUNNING`);
    console.log(`  - Local URL:    http://localhost:${PORT}`);
    console.log(`  - LAN Network:  http://${lanIP}:${PORT}`);
    console.log(`  - API Health:   http://${lanIP}:${PORT}/api/health`);
    console.log(`  - AI Scanner:   http://localhost:${PORT}/booking.html`);
    console.log('  - AI API:       /api/ai/v3.2/analyze (tích hợp cùng backend)');
    console.log('  - 9Router cần chạy theo cấu hình; không cần mở server AI cổng 5100.');
    console.log(`  - Realtime WS:  http://${lanIP}:${PORT}/socket.io/`);
    console.log('----------------------------------------------------');
    if (db.demo) console.log('  DEMO_MODE đang bật, dữ liệu được lưu trong RAM.');
    console.log('====================================================');
  });
}

function stopStartup(err) {
  console.error('[Startup]', err.message);
  process.exit(1);
}

startServer().catch(stopStartup);
