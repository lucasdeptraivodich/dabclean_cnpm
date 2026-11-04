const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'frontend/my-bookings.html'), 'utf8');
const { document, window } = parseHTML('<html><body><button class="btn-view-detail" data-id="5">Chi tiết</button><div id="detail-modal"><h3 id="modal-title"></h3><div id="modal-body"></div></div></body></html>');
const base = { id: 5, booking_code: 'CNV-TEST', status: 'pending', total_price: 425000, payment_status: 'unpaid', payment_method: 'bank_transfer', service_name: 'Dọn dẹp', booking_date: '2026-11-10', booking_time: '08:30', created_at: '2026-11-05', payment_qr: { amount: 425000, bank_name: 'BIDV', account_number: '8888444265', transfer_content: 'DABCLEAN CNVTEST', qr_url: 'https://img.vietqr.io/image/BIDV-8888444265-compact2.png?amount=425000', demo_mode: true } };
let latest = base, calls = 0, error = null;
const toasts = [];
const context = vm.createContext({ document, window, URL, Date, myBookings: [{ ...base, total_price: 1 }], statusLabels: { pending: 'Chờ xác nhận' }, paymentLabels: { bank_transfer: 'Chuyển khoản QR' }, showToast: (...args) => toasts.push(args), escapeText: value => { const n = document.createElement('span'); n.textContent = String(value ?? ''); return n.innerHTML; }, DabCleanAPI: { bookings: { getDetail: async id => { assert.equal(id, 5); calls++; if (error) throw new Error(error); return { success: true, data: latest }; } } } });
vm.runInContext(fs.readFileSync(path.join(root, 'frontend/js/booking-qr.js'), 'utf8'), context);
const start = html.indexOf('      function attachActionEvents()');
const end = html.indexOf('      // Xử lý gửi Đổi lịch', start);
assert.ok(start > 0 && end > start);
vm.runInContext(html.slice(start, end) + '\nattachActionEvents();', context);
const button = document.querySelector('.btn-view-detail');
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  button.click(); await tick();
  assert.equal(calls, 1);
  assert.equal(button.disabled, false);
  assert.ok(document.getElementById('detail-modal').classList.contains('active'));
  const qr = document.querySelector('.booking-qr-inline img');
  assert.ok(qr, 'QR must be visible inside the detail modal without another click');
  assert.equal(new URL(qr.src).searchParams.get('amount'), '425000', 'use fresh backend amount rather than 1 VND stale cache');
  for (const patch of [{ payment_status: 'paid' }, { status: 'cancelled' }, { payment_method: 'cash' }, { payment_method: 'wallet' }]) {
    latest = { ...base, ...patch, payment_qr: null };
    button.click(); await tick();
    assert.equal(document.querySelector('.booking-qr-inline'), null, 'non-payable orders must not retain a previous QR');
  }
  error = 'Không có quyền xem đơn';
  button.click(); await tick();
  assert.equal(button.disabled, false);
  assert.ok(toasts.at(-1)[1].includes(error));
  for (const file of ['booking', 'booking-care']) {
    const source = fs.readFileSync(path.join(root, `frontend/${file}.html`), 'utf8');
    assert.doesNotMatch(source, /data-val="(?:momo|vnpay)"|option value="(?:momo|vnpay)"/);
  }
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  console.log('PASS customer detail: fresh authorized fetch, inline QR/server amount, stale QR removed for paid/cancelled/cash/wallet, error recovery, disabled payment options');
})().catch(err => { console.error(err); process.exitCode = 1; });
