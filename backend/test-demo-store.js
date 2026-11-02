const assert = require('node:assert/strict');
const createStore = require('./src/services/demoStore');
const data = { users: [{ id: 1, role: 'staff', status: 'active', name: 'Demo' }, { id: 2, role: 'customer', status: 'active' }], bookingNotifications: [], bookings: [
  { id: 1, user_id: 2, status: 'pending', staff_id: null, total_price: 200000, staff_wage: 160000, commission_rate: 0.2, platform_commission: 32000, booking_code: 'DEMO-1', payment_method: 'wallet', payment_status: 'unpaid' },
  { id: 2, status: 'pending', staff_id: null, total_price: 20000000, staff_wage: 16000000, booking_code: 'DEMO-2' }
] };
const store = createStore(data);
function rejects(fn, code) { assert.throws(fn, e => e.statusCode === code); }
rejects(() => store.accept({ bookingId: 1, staffId: 2 }), 403);
rejects(() => store.accept({ bookingId: 1, staffId: 1, paymentMethod: 'bank_transfer' }), 400);
rejects(() => store.accept({ bookingId: 2, staffId: 1 }), 409);
assert.equal(data.bookings[1].status, 'pending');
assert.equal(store.getWallet(1, 'credit').balance, 1000000, 'rejected acceptance must not debit');
for (const n of [-1, 0, 0.1, Infinity, 50000001, 'bad']) rejects(() => store.topup({ userId: 2, amount: n }), 400);
store.accept({ bookingId: 1, staffId: 1 });
const credit = store.getWallet(1, 'credit').balance;
assert.equal(credit, 968000);
data.bookings[0].status = 'completed';
data.bookings[0].wage_status = 'approved';
store.settle({ bookingId: 1 });
assert.equal(store.getWallet(1, 'credit').balance, credit, 'prepaid fee cannot be deducted again');
assert.equal(store.getWallet(1, 'earnings').balance, 128000);
store.settle({ bookingId: 1 });
assert.equal(store.getWallet(1, 'earnings').balance, 128000, 'settlement retry cannot pay twice');
store.transfer({ staffId: 1, amount: 10000, idempotencyKey: 'x' });
store.transfer({ staffId: 1, amount: 10000, idempotencyKey: 'x' });
assert.equal(store.getWallet(1, 'earnings').balance, 118000);
assert.equal(store.getWallet(1, 'credit').balance, credit + 10000);
rejects(() => store.transfer({ staffId: 1, amount: 1000000 }), 409);
const copy = store.getWallet(1, 'credit'); copy.balance = 0;
assert.equal(store.getWallet(1, 'credit').balance, credit + 10000, 'read snapshots cannot mutate store');
console.log('PASS demo store: failed acceptance atomicity, roles, bank rejection, amount validation, prepaid fee, idempotent settlement/transfer and immutable snapshots');
