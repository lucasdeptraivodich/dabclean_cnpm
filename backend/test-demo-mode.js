const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
process.env.DEMO_MODE = 'true';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const db = require('./src/config/db');
assert.ok(db.demo, 'explicit demo store must exist');
assert.equal(db.getPool(), null, 'demo must not connect to MySQL');
const app = require('./src/app');
const server = app.listen(0, '127.0.0.1', async () => {
  let count = 0;
  async function call(route, id, method = 'GET', body, expected = 200) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET) } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const json = await response.json();
    assert.equal(response.status, expected, route + ': ' + json.message);
    count++;
    return json;
  }
  try {
    assert.equal((await call('/health')).demo_mode, true);
    await call('/staff/tasks/4/accept', null, 'POST', {}, 401);
    await call('/staff/tasks/4/accept', 2, 'POST', {}, 403);
    const before = (await call('/wallet/staff/wallets', 3)).data.credit_wallet.balance;
    const race = await Promise.all([3, 4].map(id => fetch(`http://127.0.0.1:${server.address().port}/api/staff/tasks/4/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET) }, body: '{}' })));
    assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
    const winner = race[0].status === 200 ? 3 : 4;
    const accepted = await race[winner === 3 ? 0 : 1].json();
    assert.equal(accepted.data.status, 'confirmed');
    const wallets = await call('/wallet/staff/wallets', winner);
    assert.equal(wallets.data.credit_wallet.balance, before - accepted.data.commission_amount);
    await call('/staff/tasks/4/accept', winner, 'POST', {});
    assert.equal((await call('/wallet/staff/wallets', winner)).data.credit_wallet.balance, wallets.data.credit_wallet.balance, 'retry cannot charge twice');
    await call('/staff/tasks/4/navigation', winner);
    await call('/staff/tasks/4/navigation', winner === 3 ? 4 : 3, 'GET', null, 403);
    await call('/wallet/staff/summary', winner);
    await call('/wallet/transactions', winner);
    await call('/bookings/4/cancel', 2, 'PUT', { reason: 'Khách hủy ca đã nhận' });
    assert.equal(db.demo.getWallet(winner, 'credit').balance, before);
    assert.equal((await require('./src/models/bookingModel').getById(4)).commission_refund_status, 'refunded');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const created = await call('/bookings', 2, 'POST', { service_id: 1, booking_date: tomorrow, booking_time: '08:30', area_size: 'medium', frequency: 'once', address: '25 Duy Tân, Cầu Giấy, Hà Nội', phone: '0987654321', payment_method: 'cash' }, 201);
    await call(`/staff/tasks/${created.data.id}/accept`, 3, 'POST', {});
    await call(`/staff/tasks/${created.data.id}/navigation`, 3);
    const staffBalance = db.demo.getWallet(3, 'credit').balance;
    const cancelled = await call(`/staff/tasks/${created.data.id}/status`, 3, 'PATCH', { status: 'cancelled', cancel_reason: 'Nhân viên không thể đến ca' });
    assert.equal(cancelled.data.commission_refund_status, 'rejected');
    assert.equal(db.demo.getWallet(3, 'credit').balance, staffBalance);
    const walletOrder = await call('/bookings', 2, 'POST', { service_id: 1, booking_date: tomorrow, booking_time: '10:30', area_size: 'medium', frequency: 'once', address: '25 Duy Tân, Hà Nội', phone: '0987654321', payment_method: 'wallet' }, 201);
    const originalCustomer = db.demo.getWallet(2, 'customer').balance;
    await call(`/bookings/${walletOrder.data.id}/cancel`, 2, 'PUT', { reason: 'Khách hủy lịch demo' });
    assert.equal((await require('./src/models/bookingModel').getById(walletOrder.data.id)).status, 'cancelled');
    assert.ok(db.demo.getWallet(2, 'customer').balance > originalCustomer);
    await call('/wallet/staff/topup-credit', 3, 'POST', { amount: 10000 }, 403); // existing policy remains disabled
    const credit = db.demo.getWallet(2, 'customer').balance;
    await call('/wallet/topup', 2, 'POST', { amount: 10000, idempotency_key: 'demo-topup' });
    await call('/wallet/topup', 2, 'POST', { amount: 10000, idempotency_key: 'demo-topup' });
    assert.equal(db.demo.getWallet(2, 'customer').balance, credit + 10000);
    const prod = spawnSync(process.execPath, ['-e', "require('./src/config/db')"], { cwd: __dirname, env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
    assert.notEqual(prod.status, 0);
    assert.match(prod.stderr, /DEMO_MODE/);
    const disabled = spawnSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const db = require('./src/config/db');
      assert.equal(db.demo, null);
      assert.equal(db.getPool(), null);
      assert.rejects(db.query('SELECT * FROM users'), { statusCode: 503 }).catch(err => {
        console.error(err);
        process.exitCode = 1;
      });
    `], { cwd: __dirname, env: { ...process.env, DEMO_MODE: 'false' }, encoding: 'utf8', timeout: 10000 });
    assert.equal(disabled.status, 0);
    console.log(`PASS ${count} demo HTTP cases + competing staff, idempotent acceptance, cash booking/navigation/cancel, production prohibition and opt-in`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
