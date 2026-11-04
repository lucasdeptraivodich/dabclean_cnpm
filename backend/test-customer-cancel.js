const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const db = require('./src/config/db');
const Booking = require('./src/models/bookingModel');
const app = require('./src/app');
const server = app.listen(0, '127.0.0.1', async () => {
  let count = 0;
  async function call(route, id, method = 'GET', body, expected = 200) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, { method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await response.json();
    assert.equal(response.status, expected, route + ': ' + json.message); count++;
    return json;
  }
  const body = { service_id: 1, booking_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), booking_time: '09:30', area_size: 'medium', frequency: 'once', address: '25 Duy Tân, Hà Nội', phone: '0987654321', payment_method: 'bank_transfer' };
  const create = async extra => (await call('/bookings', 2, 'POST', { ...body, ...extra }, 201)).data;
  const cancel = (id, user = 2, expected = 200, reason = 'Thay đổi kế hoạch cá nhân') => call(`/bookings/${id}/cancel`, user, 'PUT', { reason }, expected);
  try {
    const qr = await create();
    await call(`/bookings/${qr.id}`, 2); // reloading detail cannot change state
    await cancel(qr.id, null, 401);
    await cancel(qr.id, 3, 403);
    await cancel(qr.id, 2, 400, 'a');
    await cancel(qr.id, 2, 400, 'x'.repeat(501));
    await cancel(qr.id);
    const cancelled = (await call(`/bookings/${qr.id}`, 2)).data;
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(cancelled.cancel_reason, 'Thay đổi kế hoạch cá nhân');
    assert.equal(cancelled.wage_status, 'cancelled');
    assert.equal(cancelled.payment_status, 'unpaid');
    assert.equal(cancelled.payment_qr, null);
    await cancel(qr.id, 2, 400);
    for (const state of ['assigned', 'confirmed']) {
      const b = await create({ payment_method: 'cash' });
      await db.query('UPDATE bookings SET staff_id = ?, status = ? WHERE id = ?', [3, state, b.id]);
      await cancel(b.id);
    }
    const wallet = await create({ payment_method: 'wallet' });
    const balance = db.demo.getWallet(2, 'customer').balance;
    await cancel(wallet.id);
    assert.equal(db.demo.getWallet(2, 'customer').balance, balance + Number(wallet.total_price));
    await cancel(wallet.id, 2, 400);
    assert.equal(db.demo.getWallet(2, 'customer').balance, balance + Number(wallet.total_price));
    for (const state of ['arrived', 'in_progress', 'completed']) {
      const b = await create({ payment_method: 'cash' });
      await db.query('UPDATE bookings SET staff_id = ?, status = ? WHERE id = ?', [3, state, b.id]);
      await cancel(b.id, 2, 400);
    }
    const race = await create();
    const outcomes = await Promise.all([Booking.updateStatus(race.id, 'cancelled', 'Lý do thứ nhất', 'pending'), Booking.updateStatus(race.id, 'cancelled', 'Lý do thứ hai', 'pending')]);
    assert.deepEqual(outcomes, [true, false]);
    assert.equal((await Booking.getById(race.id)).cancel_reason, 'Lý do thứ nhất');
    const concurrent = await create();
    const requests = await Promise.all(['Yêu cầu hủy A', 'Yêu cầu hủy B'].map(reason => fetch(`http://127.0.0.1:${server.address().port}/api/bookings/${concurrent.id}/cancel`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id: 2 }, process.env.JWT_SECRET) }, body: JSON.stringify({ reason }) })));
    assert.equal(requests.filter(r => r.status === 200).length, 1);
    assert.ok(requests.every(r => [200, 400, 409].includes(r.status)));
    const winner = requests[0].status === 200 ? 'Yêu cầu hủy A' : 'Yêu cầu hủy B';
    assert.equal((await Booking.getById(concurrent.id)).cancel_reason, winner);
    for (const payment_method of ['momo', 'vnpay']) await call('/bookings', 2, 'POST', { ...body, payment_method }, 400);
    console.log(`PASS ${count} customer cancellation/payment HTTP cases + stale-state CAS/concurrency; isolated demo data`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
