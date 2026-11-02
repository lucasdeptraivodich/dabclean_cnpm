const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const server = app.listen(0, '127.0.0.1', async () => {
  let count = 0;
  async function cancel(id, user, reason, expected) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/staff/tasks/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: 'Bearer ' + jwt.sign({ id: user }, process.env.JWT_SECRET) } : {}) },
      body: JSON.stringify({ status: 'cancelled', cancel_reason: reason })
    });
    assert.equal(response.status, expected, `task ${id}, user ${user}`);
    count++;
    return response.json();
  }
  try {
    await cancel(1, null, 'Không thể đến nhà khách', 401);
    await cancel(1, 2, 'Không thể đến nhà khách', 403);
    await cancel(1, 4, 'Không thể đến nhà khách', 403);
    await cancel(3, 4, 'Không thể đến nhà khách', 409);
    await cancel(2, 3, 'Không thể đến nhà khách', 409);
    await cancel(1, 3, ' a ', 400);
    await cancel(1, 3, 'x'.repeat(501), 400);
    await cancel(1, 3, { reason: 'bad type' }, 400);
    const result = await cancel(1, 3, 'Không thể đến nhà khách', 200);
    assert.equal(result.success, true);
    const booking = await require('./src/models/bookingModel').getById(1);
    assert.equal(booking.status, 'cancelled');
    assert.equal(booking.cancel_reason, 'Không thể đến nhà khách');
    console.log(`PASS ${count} cancellation HTTP/auth/validation/state cases; isolated in-memory booking only`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
