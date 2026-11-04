const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(route, body, token) {
    const res = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, data: await res.json() };
  }
  try {
    const login = await call('/auth/login', { email: 'demo@nova.app', password: 'NovaDemo2026!' });
    assert.equal(login.status, 200);
    const token = login.data.data.token;
    for (const service_id of [6, 7, 8]) {
      const body = { service_id, booking_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), booking_time: '08:30', package_type: 'hourly', duration_hours: 3, recipient_name: 'Người thân kiểm thử', recipient_age: '70', address: '25 Duy Tân, Hà Nội', phone: '0900000000', payment_method: 'cash' };
      assert.equal((await call('/bookings', body)).status, 401);
      assert.equal((await call('/bookings', body, 'invalid-token')).status, 401);
      const expired = jwt.sign({ id: 2 }, process.env.JWT_SECRET, { expiresIn: -1 });
      assert.equal((await call('/bookings', body, expired)).status, 401);
      const result = await call('/bookings', body, token);
      assert.equal(result.status, 201, JSON.stringify(result.data));
      assert.ok(result.data.data.booking_code);
    }
    console.log('PASS care API: real login + 3 services created; guest, invalid and expired tokens rejected (9 cases)');
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
