const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
const model = require('./src/models/commissionPaymentModel');
(async () => {
  for (const staffId of [3, 4, 999]) {
    const rows = await model.getAvailableBookingsForStaff(staffId);
    assert.ok(rows.some(row => row.id === 4), 'unassigned pending booking is available');
    for (const row of rows) {
      assert.ok((row.status === 'pending' && (row.staff_id == null || row.staff_id === staffId)) || (row.status === 'assigned' && row.staff_id === staffId), 'exclude completed/accepted/other staff work');
      for (const field of ['customer_email', 'customer_phone', 'notes', 'user_email', 'user_name']) assert.equal(Object.hasOwn(row, field), false, 'match SQL projection: ' + field);
    }
  }
  console.log('PASS available booking filters and projection for 3 staff identities (in-memory only)');
})().catch(err => { console.error(err); process.exitCode = 1; });
