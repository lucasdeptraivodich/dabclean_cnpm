'use strict';
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

(async () => {
  const received = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    received.push({ url: req.url, contentType: req.headers['content-type'], body: Buffer.concat(chunks).toString() });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ forwarded: true }));
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  process.env.AI_MODULE_URL = upstreamUrl;
  const app = express();
  app.use(express.json());
  app.use('/api/ai', require('./src/routes/aiRoutes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/ai`;
    const jsonResponse = await fetch(`${baseUrl}/v3.2/analyze?mode=test`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sample: 1 })
    });
    assert.equal(jsonResponse.status, 200);
    assert.equal(received[0].url, '/api/ai/v3.2/analyze?mode=test');
    assert.deepEqual(JSON.parse(received[0].body), { sample: 1 });

    const boundary = 'dabclean-test-boundary';
    const multipart = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\ntest-bytes\r\n--${boundary}--\r\n`;
    const multipartResponse = await fetch(`${baseUrl}/v3.2/analyze`, {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: multipart
    });
    assert.equal(multipartResponse.status, 200);
    assert.equal(received[1].body, multipart);
    assert.equal(received[1].contentType, `multipart/form-data; boundary=${boundary}`);
    console.log('PASS AI proxy forwards JSON and multipart requests to the standalone AI service.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => upstream.close(resolve));
    delete process.env.AI_MODULE_URL;
  }
})().catch(error => {
  console.error('FAIL AI proxy:', error.message);
  process.exitCode = 1;
});
