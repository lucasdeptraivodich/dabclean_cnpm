// Real HTTP router/authentication, isolated model fixtures; no MySQL claim.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Module = require('node:module');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const jwt = require('jsonwebtoken');
const express = require('express');
let booking = { id: 10, staff_id: 2, status: 'confirmed', address: '12 Nguyễn Trãi, Hà Nội' };
const users = { 1: { id: 1, role: 'customer' }, 2: { id: 2, role: 'staff' }, 3: { id: 3, role: 'staff' }, 4: { id: 4, role: 'admin' }, 5: { id: 5, role: 'staff', status: 'inactive' } };
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === '../models/bookingModel') return { getById: async id => id === 10 ? booking : null };
  if (name === '../models/userModel') return { findById: async id => users[id] };
  if (['../models/walletModel', '../models/commissionPaymentModel', '../config/db'].includes(name)) return {};
  return originalLoad.call(this, name, ...args);
};
const router = require('./src/routes/staffRoutes');
Module._load = originalLoad;
const app = express();
app.use('/api/staff', router);
app.use((err, req, res, next) => res.status(500).json({ success: false }));
const server = app.listen(0, '127.0.0.1', async () => {
  let count = 0;
  async function check(id, expected, task = '10', tokenOverride) {
    const token = tokenOverride || (id && jwt.sign({ id }, process.env.JWT_SECRET));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/staff/tasks/${task}/navigation`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    assert.equal(response.status, expected, `user=${id}, state=${booking.status}, task=${task}`);
    count++;
    return response.json();
  }
  try {
    await check(null, 401);
    await check(1, 403);
    await check(3, 403);
    await check(5, 403);
    await check(2, 401, '10', 'forged');
    await check(2, 400, '10abc');
    await check(2, 400, '0');
    await check(2, 404, '11');
    for (const state of ['pending', 'assigned', 'completed', 'cancelled']) {
      booking.status = state;
      await check(2, 409);
    }
    for (const state of ['confirmed', 'arrived', 'in_progress']) {
      booking.status = state;
      const result = await check(2, 200);
      assert.deepEqual(result.data, { id: 10, address: booking.address });
    }
    await check(4, 200);
    booking.address = ' ';
    await check(2, 422);
    console.log(`PASS ${count} navigation HTTP/auth/state cases`);
  } catch (err) { console.error(err); process.exitCode = 1; }
  finally { server.close(); }
});
