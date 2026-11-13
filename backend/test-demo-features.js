const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const { createServer } = require('node:http');
const { io } = require('socket.io-client');
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const db = require('./src/config/db');
const { initSocket } = require('./src/services/socketService');

async function run() {
  const server = createServer(app);
  const sockets = [];
  initSocket(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const path = '/demo/features';
  let checks = 0;
  async function call(route, id, expected = 200, body, method = 'POST') {
    const response = await fetch(base + '/api' + route, {
      headers: {
        'Content-Type': 'application/json',
        ...(id && { Authorization: 'Bearer ' + jwt.sign({ id }, process.env.JWT_SECRET) })
      },
      ...(body === undefined ? {} : { method, body: JSON.stringify(body) })
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    assert.equal(response.status, expected, `${route} as ${id}: ${JSON.stringify(payload)}`);
    checks++;
    return payload?.data;
  }
  try {
    const page = await fetch(base + '/demo-features.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /js\/demo-features.js/);
    await call(path, null, 401);
    const customer = await call(path, 2);
    assert.equal(customer.points, 32);
    await call(path + '/staff-directory', 3, 403);
    const directory = await call(path + '/staff-directory', 2);
    assert.equal(directory.find(worker => worker.id === 3).served, true);
    assert.equal(directory.find(worker => worker.id === 4).served, false);
    assert.ok(directory.every(worker => !worker.email && !worker.phone && !worker.address));
    await call(path + '/face-check', 2, 403, {});
    assert.equal((await call(path + '/face-check', 4)).verifiedAt, null);
    const face = await call(path + '/face-check', 4, 200, {});
    assert.ok(face.verifiedAt);
    assert.equal((await call(path + '/face-check', 4, 200, {})).verifiedAt, face.verifiedAt);
    await call(path + '/staff-directory/favorite', 2, 204, { staffId: 4, favorite: true });
    assert.equal((await call(path + '/staff-directory', 2)).find(worker => worker.id === 4).favorite, true);
    await call(path + '/favorite', 3, 403, { staffId: 3 });
    await call(path + '/favorite', 2, 400, { staffId: 4 });
    await call(path + '/favorite', 2, 204, { staffId: 3 });
    assert.equal((await call(path, 2)).favoriteStaff, 3);

    const bookingInput = {
      service_id: 1, booking_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      booking_time: '09:30', area_size: 'medium', frequency: 'weekly', address: '25 Duy Tân, Hà Nội',
      phone: '0987654321', payment_method: 'bank_transfer'
    };
    const booking = await call('/bookings', 2, 201, bookingInput);
    const order = path + '/bookings/' + booking.id;
    const row = async id => (await call(path, id)).bookings.find(item => item.id === booking.id);
    const initialStats = await call('/admin/stats?period=all', 1);
    await call(order + '/pay', 3, 403, {});
    await call(order + '/pay', 2, 204, { amount: 1 });
    await call(order + '/pay', 2, 204, {});
    assert.equal((await row(2)).payment.amount, Number(booking.total_price));
    assert.equal((await call('/admin/stats?period=all', 1)).gross_payments, initialStats.gross_payments + Number(booking.total_price));
    await call(order + '/message', 2, 409, { text: 'Chưa được chat' });
    await call(order + '/dispatch', 2, 403, {});
    await call(order + '/dispatch', 1, 409, {});
    assert.equal((await call(path, 3)).offers[0].canAccept, true);
    assert.equal((await call(path, 4)).offers[0].canAccept, false);
    await call(`/staff/tasks/${booking.id}/accept`, 4, 409, {});
    await call(`/staff/tasks/${booking.id}/accept`, 3, 200, {});
    await call(order + '/message', 4, 403, { text: 'Không phụ trách' });
    await call(order + '/message', 1, 403, { text: 'Ngoài cuộc trò chuyện' });
    for (const id of [2, 3, 4]) {
      const socket = io(base, { auth: { token: jwt.sign({ id }, process.env.JWT_SECRET) }, transports: ['websocket'], reconnection: false });
      sockets.push(socket);
      await once(socket, 'connect', { signal: AbortSignal.timeout(3000) });
    }
    let unrelatedEvents = 0;
    sockets[2].on('demo_features_changed', () => unrelatedEvents++);
    const updates = sockets.slice(0, 2).map(socket => once(socket, 'demo_features_changed', { signal: AbortSignal.timeout(3000) }));
    await call(order + '/message', 2, 204, { text: '<b>Ghi chú dạng chữ</b>' });
    assert.deepEqual(await Promise.all(updates), [[], []], 'Socket.IO sends only a refresh signal to booking participants');
    assert.equal(unrelatedEvents, 0);
    assert.equal((await row(3)).messages[0].text, '<b>Ghi chú dạng chữ</b>');
    assert.equal((await row(1)).messages, undefined);
    await call(order + '/message', 3, 400, { photo: 'data:image/svg+xml,<svg/>' });
    const jpeg = await require('../ai-module/node_modules/sharp')({
      create: { width: 16, height: 16, channels: 3, background: '#ccc' }
    }).jpeg().toBuffer();
    const photo = 'data:image/jpeg;base64,' + jpeg.toString('base64');
    await call(order + '/message', 3, 204, { photo });
    assert.equal((await row(2)).messages[1].photo, photo);
    await call(order + '/location', 2, 403, { latitude: 21, longitude: 105 });
    await call(order + '/location', 3, 400, { latitude: 91, longitude: 105 });
    const locationUpdate = once(sockets[0], 'demo_features_changed', { signal: AbortSignal.timeout(3000) });
    await call(order + '/location', 3, 204, { latitude: 21.029, longitude: 105.855 });
    assert.deepEqual(await locationUpdate, []);
    assert.equal((await row(2)).location.latitude, 21.029);
    await call(order + '/stopLocation', 3, 204, {});
    assert.equal((await row(2)).location, undefined);
    const signature = { strokes: [[[0.1, 0.1], [0.5, 0.5]]] };
    await call(order + '/signature', 3, 409, signature);
    await call(`/staff/tasks/${booking.id}/status`, 3, 200, { status: 'in_progress' }, 'PATCH');
    await call(order + '/signature', 3, 400, { strokes: [[[0.1, 0.1], [2, 2]]] });
    await call(order + '/signature', 3, 204, signature);
    await call(order + '/signature', 3, 409, signature);
    assert.deepEqual((await row(2)).signature.strokes, signature.strokes);
    await call(order + '/dispute', 2, 400, { reason: 'Thiếu bằng chứng' });
    await call(order + '/dispute', 2, 204, { reason: 'Yêu cầu đối soát demo', evidence: photo });
    await call(order + '/statement', 3, 204, { statement: 'Bản tường trình mẫu từ nhân viên.' });
    assert.equal((await row(1)).dispute.statement, 'Bản tường trình mẫu từ nhân viên.');
    await call(order + '/resolve', 2, 403, { note: 'Không hợp lệ', amount: 10000 });
    await call(order + '/resolve', 1, 400, { note: 'Vượt giới hạn', amount: Number(booking.total_price) + 1 });
    assert.throws(() => db.demo.features.enforceSettlement(booking.id), { statusCode: 409 });
    const results = await Promise.all([204, 409].map(() => fetch(base + '/api' + order + '/resolve', {
      method: 'POST', headers: {
        Authorization: 'Bearer ' + jwt.sign({ id: 1 }, process.env.JWT_SECRET), 'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note: 'Hoàn một phần demo', amount: 10000 })
    })));
    assert.deepEqual(results.map(response => response.status).sort(), [204, 409]);
    assert.equal((await row(2)).payment.refunded, 10000);
    assert.equal((await row(3)).dispute.evidence, undefined);
    await call(`/staff/tasks/${booking.id}/checklist`, 1);
    await call(`/staff/tasks/${booking.id}/checklist`, 4, 403);
    assert.equal((await call('/admin/stats?period=all', 1)).refund_amount, initialStats.refund_amount + 10000);
    assert.doesNotThrow(() => db.demo.features.enforceSettlement(booking.id));
    await call(path + '/favorite', 2, 204, { staffId: null });
    const another = await call('/bookings', 2, 201, { ...bookingInput, booking_time: '11:30', frequency: 'once' });
    const secondOrder = path + '/bookings/' + another.id;
    await call(secondOrder + '/pay', 2, 204, {});
    await call(secondOrder + '/dispatch', 1, 409, {});
    const plan = (await call(path, 1)).bookings.find(item => item.id === another.id).dispatch;
    assert.deepEqual(plan.priorityIds, plan.candidates.filter(candidate => candidate.km <= 3).map(candidate => candidate.id));
    await call(`/staff/tasks/${another.id}/accept`, 3, 200, {});
    await call(secondOrder + '/dispute', 2, 204, { reason: 'Thử hoàn toàn bộ', evidence: photo });
    await call(secondOrder + '/resolve', 1, 204, { note: 'Hoàn toàn bộ', amount: Number(another.total_price) });
    const refunded = (await call(path, 2)).bookings.find(item => item.id === another.id);
    assert.equal(refunded.paymentStatus, 'refunded');
    assert.equal(refunded.payment.refunded, refunded.payment.amount);
    const reportRange = '?from=2020-01-01&to=2099-12-31';
    await call(path + '/finance/ledger' + reportRange, 2, 403);
    await call(path + '/finance/ledger?from=2026-02-30&to=2099-12-31', 1, 400);
    for (const [kind, expected] of [['ledger', /commission_deduction/], ['commission', new RegExp(another.booking_code)]]) {
      const response = await fetch(base + '/api' + path + '/finance/' + kind + reportRange, {
        headers: { Authorization: 'Bearer ' + jwt.sign({ id: 1 }, process.env.JWT_SECRET) }
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /text\/csv/);
      assert.match(await response.text(), expected);
    }
    const repeat = path + '/repeat/2';
    await call(repeat, 3, 403, { date: bookingInput.booking_date });
    await call(repeat, 2, 400, { date: 'not-a-date' });
    const repeated = await call(repeat, 2, 201, { date: bookingInput.booking_date, total_price: 1, user_id: 4 });
    assert.equal(repeated.user_id, 2);
    assert.equal(repeated.frequency, 'weekly');
    assert.ok(Number(repeated.total_price) > 1);
    await call('/bookings', 2, 400, { ...bookingInput, preferred_staff_id: 2 });
    const chosenInput = { ...bookingInput, booking_time: '13:30', payment_method: 'bank_transfer', preferred_staff_id: 4 };
    await call('/bookings', 2, 409, chosenInput);
    await call('/bookings', 2, 400, { ...chosenInput, prebook: true, payment_method: 'wallet' });
    const chosen = await call('/bookings', 2, 201, { ...chosenInput, prebook: true });
    assert.equal(chosen.payment_qr, null);
    assert.equal((await call(`/bookings/${chosen.id}`, 2)).staff_profiles.requested.id, 4);
    await call(path + '/bookings/' + chosen.id + '/pay', 2, 409, {});
    await call(`/staff/tasks/${chosen.id}/accept`, 3, 409, {});
    await call(path + '/prebook/' + chosen.id + '/decision', 3, 403, { decision: 'approve' });
    await call(path + '/prebook/' + chosen.id + '/decision', 4, 204, { decision: 'approve' });
    assert.equal((await call(`/bookings/${chosen.id}`, 2)).staff_profiles.prebook.status, 'approved');
    assert.equal((await call(`/bookings/${chosen.id}`, 2)).status, 'pending');
    await call('/staff/tasks/3/status', 4, 200, { status: 'completed' }, 'PATCH');
    const assigned = (await call(`/bookings/${chosen.id}`, 2)).staff_profiles.assigned;
    assert.equal(assigned.id, 4);
    assert.equal(assigned.faceVerified, true);
    assert.equal(assigned.favorite, true);
    assert.equal(assigned.phone, undefined);
    await call(path + '/bookings/' + chosen.id + '/pay', 2, 204, {});
    await call(`/staff/tasks/${chosen.id}/status`, 4, 200, { status: 'in_progress' }, 'PATCH');
    await call(`/staff/tasks/${chosen.id}/status`, 4, 200, { status: 'completed' }, 'PATCH');
    const declined = await call('/bookings', 2, 201, { ...chosenInput, booking_time: '14:30', preferred_staff_id: 3, prebook: true });
    const decision = path + '/prebook/' + declined.id + '/decision';
    await call(decision, 3, 400, { decision: 'decline', reason: 'x' });
    await call(decision, 3, 204, { decision: 'decline', reason: 'Không thể nhận ca vào giờ này.' });
    assert.equal((await call(`/bookings/${declined.id}`, 2)).staff_profiles.prebook.reason, 'Không thể nhận ca vào giờ này.');
    await call(path + '/bookings/' + declined.id + '/reselect', 2, 204, { staffId: 4 });
    await call(decision, 4, 204, { decision: 'decline', reason: 'Đã có việc riêng.' });
    await call(`/bookings/${declined.id}/cancel`, 2, 200, { reason: 'Không còn nhu cầu đặt lịch.' }, 'PUT');
    const originalNow = Date.now;
    try {
      const expired = await call('/bookings', 2, 201, { ...chosenInput, booking_time: '16:30', preferred_staff_id: 3, prebook: true });
      const later = originalNow() + 31 * 60000;
      Date.now = () => later;
      await call(path + '/prebook/' + expired.id + '/decision', 3, 409, { decision: 'approve' });
      assert.match((await call(`/bookings/${expired.id}`, 2)).staff_profiles.prebook.reason, /30 phút/);
      await call(path + '/bookings/' + expired.id + '/redispatch', 2, 204, {});
    } finally { Date.now = originalNow; }
    const care = await call('/bookings', 2, 201, {
      ...bookingInput, service_id: 7, booking_time: '15:30', frequency: 'once',
      package_type: 'hourly', duration_hours: 3, recipient_name: 'Người thân mẫu', recipient_age: 70
    });
    const careTask = `/staff/tasks/${care.id}`;
    await call(path + '/bookings/' + care.id + '/pay', 2, 204, {});
    await call(careTask + '/accept', 3, 200, {});
    await call(careTask + '/status', 3, 200, { status: 'in_progress' }, 'PATCH');
    await call(careTask + '/status', 3, 409, { status: 'completed' }, 'PATCH');
    await call(`/admin/bookings/${care.id}/status`, 1, 409, { status: 'completed' }, 'PUT');
    await call(path + '/bookings/' + care.id + '/signature', 3, 204, signature);
    await call(careTask + '/status', 3, 200, { status: 'completed' }, 'PATCH');
    const membership = await call(path + '/membership', 2);
    assert.equal(membership.tier, 'Vàng');
    assert.equal(membership.discountRate, 0.05);
    const quoteInput = { service_id: 1, area_size: 'medium', frequency: 'once' };
    const publicQuote = await call('/bookings/quote', null, 200, quoteInput);
    const memberQuote = await call('/bookings/quote', 2, 200, quoteInput);
    assert.equal(memberQuote.total_price, Math.round(publicQuote.total_price * 0.95));
    const memberBooking = await call('/bookings', 2, 201, { ...bookingInput, ...quoteInput, booking_time: '17:30' });
    assert.equal(Number(memberBooking.total_price), memberQuote.total_price);
    assert.equal((await call('/bookings/quote', 2, 200, { ...quoteInput, frequency: 'weekly' })).total_price,
      (await call('/bookings/quote', null, 200, { ...quoteInput, frequency: 'weekly' })).total_price);
    const pricing = require('./src/services/pricingService');
    const service = await require('./src/models/serviceModel').getById(1);
    const regular = pricing.calculatePrice(service, quoteInput);
    assert.equal(pricing.calculatePrice(service, { ...quoteInput, membership_rate: 0.10 }).totalPrice,
      Math.round(regular.totalPrice * 0.90));
    await call(path + '/identity', 2, 403);
    assert.equal((await call(path + '/identity', 1))[0].status, 'pending');
    await call(path + '/identity', 1, 409, { decision: 'verified' });
    await call(path + '/identity', 1, 409, { decision: 'sign' });
    assert.equal((await call(path + '/identity', 1, 200, { decision: 'scan' }))[0].extracted.document, 'DEMO-0001');
    assert.ok((await call(path + '/identity', 1, 200, { decision: 'sign' }))[0].signedAt);
    assert.equal((await call(path + '/identity', 1, 200, { decision: 'verified' }))[0].status, 'verified');
    await call(path + '/identity', 1, 409, { decision: 'rejected' });
    const claim = id => path + '/bookings/' + id;
    const customerBalance = db.demo.getWallet(2, 'customer').balance;
    const small = claim(chosen.id);
    await call(small + '/dispute', 2, 204, { reason: 'Hỏng đồ gia dụng', evidence: photo });
    await call(small + '/verdict', 2, 403, { decision: 'staff_fault', note: 'Không có quyền', amount: 10000 });
    await call(small + '/verdict', 1, 204, { decision: 'staff_fault', note: 'Thiệt hại nhỏ', amount: 10000 });
    assert.equal(db.demo.getWallet(2, 'customer').balance, customerBalance + 10000);
    assert.equal((await call(path, 4)).staffTrust.score, 90);
    await call(small + '/verdict', 1, 409, { decision: 'staff_fault', note: 'Thử lặp', amount: 10000 });
    const large = claim(care.id);
    await call(large + '/dispute', 2, 204, { reason: 'Thiệt hại tài sản', evidence: photo });
    await call(large + '/verdict', 1, 204, { decision: 'staff_fault', note: 'Xem xét thủ công', amount: 50000001 });
    assert.equal((await call(path, 2)).bookings.find(item => item.id === care.id).dispute.status, 'open');
    await call(large + '/verdict', 1, 204, { decision: 'staff_fault', note: 'Chi trả bảo hiểm demo', amount: 600000 });
    const verdict = (await call(path, 2)).bookings.find(item => item.id === care.id).dispute;
    assert.equal(verdict.staffDebit, 500000);
    assert.equal(verdict.insuranceContribution, 100000);
    assert.equal((await call(path, 3)).staffTrust.suspended, true);
    const held = await call('/bookings', 2, 201, { ...bookingInput, booking_time: '18:30', frequency: 'once' });
    await call(`/staff/tasks/${held.id}/accept`, 4, 200, {});
    await call(`/staff/tasks/${held.id}/status`, 4, 200, { status: 'in_progress' }, 'PATCH');
    await call(claim(held.id) + '/dispute', 2, 204, { reason: 'Kiểm tra tạm giữ', evidence: photo });
    const earnings = db.demo.getWallet(4, 'earnings').balance;
    await call(`/staff/tasks/${held.id}/status`, 4, 200, { status: 'completed' }, 'PATCH');
    assert.equal(db.demo.getWallet(4, 'earnings').balance, earnings);
    await call(claim(held.id) + '/verdict', 1, 204, { decision: 'dismissed', note: 'Bằng chứng không đủ căn cứ', amount: 0 });
    assert.ok(db.demo.getWallet(4, 'earnings').balance > earnings);
    await call(claim(2) + '/dispute', 2, 409, { reason: 'Đã quá thời hạn', evidence: photo });
    const disabled = spawnSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const server = require('./src/app').listen(0, '127.0.0.1', async () => {
        try {
          const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/demo/features');
          assert.equal(response.status, 404);
        } catch (err) { console.error(err); process.exitCode = 1; }
        finally { server.close(); }
      });
    `], { cwd: __dirname, env: { ...process.env, DEMO_MODE: 'false' }, encoding: 'utf8', timeout: 10000 });
    assert.equal(disabled.status, 0, disabled.stderr);
    console.log(`PASS ${checks} demo feature HTTP checks + concurrent refund, report reconciliation, and disabled mode`);
  } finally {
    for (const socket of sockets) socket.disconnect();
    server.close();
  }
}

run().catch(err => { console.error(err); process.exitCode = 1; });
