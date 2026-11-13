const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
const crypto = require('node:crypto');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const { buildBookingVietQr } = require('./src/services/bookingVietQr');
const base = { booking_code: 'CNV-202611-ABC123', total_price: '157500.00', payment_method: 'bank_transfer', payment_status: 'unpaid', status: 'pending' };
const payment = buildBookingVietQr(base);
assert.equal(payment.amount, 157500);
assert.equal(payment.bank_id, 'BIDV');
assert.equal(payment.account_number, '8888444265');
assert.equal(new URL(payment.qr_url).pathname, '/image/BIDV-8888444265-print.svg');
assert.equal(new URL(payment.qr_url).searchParams.get('amount'), '157500');
assert.equal(new URL(payment.qr_url).searchParams.get('addInfo'), payment.transfer_content);
assert.match(payment.transfer_content, /^[A-Z0-9 ]{1,50}$/);
for (const patch of [{ total_price: 0 }, { total_price: -1 }, { total_price: 1.5 }, { total_price: 'bad' }, { total_price: 10000000000000 }, { booking_code: '' }, { booking_code: '<script>alert(1)</script>' }, { booking_code: 'A'.repeat(41) }, { payment_method: 'cash' }, { payment_method: 'wallet' }, { payment_status: 'paid' }, { payment_status: 'refunded' }, { status: 'cancelled' }, { quote_status: 'pending_survey' }]) assert.equal(buildBookingVietQr({ ...base, ...patch }), null);
const app = require('./src/app');
const server = app.listen(0, '127.0.0.1', async () => {
  let count = 0;
  async function request(route, id, method = 'GET', body, status = 200) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${route}`, { method, headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = await response.json();
    assert.equal(response.status, status, route + ': ' + json.message); count++;
    return json;
  }
  try {
    const body = { service_id: 1, booking_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), booking_time: '09:30', area_size: 'medium', frequency: 'once', address: '25 Duy Tân, Hà Nội', phone: '0987654321', payment_method: 'bank_transfer', payment_status: 'paid', total_price: 1, amount: 1, account_number: 'hacked' };
    await request('/bookings', null, 'POST', body, 401);
    const created = (await request('/bookings', 2, 'POST', body, 201)).data;
    assert.equal(created.payment_status, 'unpaid');
    assert.equal(created.payment_qr.amount, Number(created.total_price));
    assert.notEqual(created.payment_qr.amount, 1);
    assert.equal(created.payment_qr.provider, 'vietqr');
    assert.equal(created.payment_qr.demo_mode, true);
    assert.equal(created.payment_qr.account_number, '8888444265');
    assert.equal(new URL(created.payment_qr.qr_url).pathname, '/image/BIDV-8888444265-print.svg');
    const detail = (await request(`/bookings/${created.id}`, 2)).data;
    assert.deepEqual(detail.payment_qr, created.payment_qr);
    await request(`/bookings/${created.id}`, null, 'GET', null, 401);
    await request(`/bookings/${created.id}`, 3, 'GET', null, 403);
    await request(`/bookings/${created.id}`, 1);
    const cash = (await request('/bookings', 2, 'POST', { ...body, payment_method: 'cash' }, 201)).data;
    assert.equal(cash.payment_qr, null);
    console.log(`PASS VietQR unit boundaries + ${count} HTTP creation/amount integrity/auth/detail cases; no money transferred`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
