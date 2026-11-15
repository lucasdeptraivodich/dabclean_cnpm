const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');

function createRemoteAiRouter(baseUrl) {
  const router = express.Router();
  const target = new URL(baseUrl);

  router.use((req, res) => {
    const transport = target.protocol === 'https:' ? https : http;
    const body = req.is('application/json') ? Buffer.from(JSON.stringify(req.body || {})) : null;
    const headers = { ...req.headers, host: target.host };
    if (body) {
      headers['content-length'] = body.length;
      delete headers['transfer-encoding'];
    } else if (req.headers['content-length']) headers['content-length'] = req.headers['content-length'];

    const upstream = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      method: req.method,
      path: `${target.pathname.replace(/\/$/, '')}${req.originalUrl}`,
      headers
    }, response => {
      res.status(response.statusCode || 502);
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined) res.setHeader(name, value);
      }
      response.pipe(res);
    });
    upstream.once('error', error => {
      if (!res.headersSent) res.status(502).json({ success: false, code: 'AI_MODULE_UNAVAILABLE', message: 'Dịch vụ AI hiện chưa khả dụng.' });
      else res.destroy(error);
    });
    if (body) upstream.end(body);
    else req.pipe(upstream);
  });

  return router;
}

// Compose can route AI requests to its independent service; local development keeps the in-process route.
if (process.env.AI_MODULE_URL) {
  module.exports = createRemoteAiRouter(process.env.AI_MODULE_URL);
  return;
}

// Nạp router xử lý AI từ ai-module an toàn (fallback nếu ai-module chưa cài dependencies)
let aiRoutes;
try {
  aiRoutes = require(path.join(__dirname, '../../../ai-module/src/routes/aiRoutes'));
} catch (err) {
  console.warn('[AI Module] Lưu ý: Không thể tải ai-module:', err.message);
  console.warn('[AI Module] Để sử dụng tính năng AI phân tích ảnh, hãy chạy "npm install" trong thư mục ai-module.');
  
  const fallbackRouter = express.Router();
  fallbackRouter.all('*', (req, res) => {
    res.status(503).json({
      success: false,
      code: 'AI_MODULE_UNAVAILABLE',
      message: 'Module AI phân tích ảnh hiện chưa khả dụng. Vui lòng cài đặt thư viện phụ thuộc bằng lệnh: cd ai-module && npm install',
      error: 'AI dependency initialization failed'
    });
  });
  aiRoutes = fallbackRouter;
}

module.exports = aiRoutes;
