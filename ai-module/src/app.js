// ============================================================
// DABCLEAN AI MODULE - Express App
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');

const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Cho phép gọi từ mọi origin trong môi trường dev (frontend DabClean ở cổng 5000,
// Live Server 5500, hoặc mở trực tiếp từ module này ở cổng 5100).
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API ---
app.use('/api/ai', aiRoutes);

// --- Giao diện demo tĩnh (thư mục public/) ---
// Phục vụ cả ở gốc (http://host:5100) và dưới /demo để tiện truy cập.
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));
app.use('/demo', express.static(publicPath));
// Shared V3 viewer assets; only these two files are exposed, not the frontend directory.
app.get('/v3-view.js', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/js/ai-v3.js')));
app.get('/v3-view.css', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/css/ai-v3.css')));

// Thông tin module dạng JSON (trước đây ở "/", nay chuyển sang "/info")
app.get('/info', (req, res) => {
  res.json({
    service: 'DabClean AI Module',
    version: '3.2.0',
    engine: 'ChatGPT via 9Router',
    endpoints: {
      health: 'GET  /api/ai/health',
      capabilities: 'GET /api/ai/v3.2/capabilities',
      scan: 'POST /api/ai/v3.2/analyze (multipart: image | images)'
    },
    demo: '/v3.html'
  });
});

// 404 cho API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint không tồn tại.' });
});

// Xử lý lỗi tập trung
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[AI Module Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: 'Dịch vụ AI không khả dụng.'
  });
});

module.exports = app;
