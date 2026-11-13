const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '../..');
const { document, window } = parseHTML('<html><body></body></html>');
window.location = {};
const create = document.createElement.bind(document);
document.createElement = tag => {
  const node = create(tag);
  if (tag === 'dialog') {
    node.showModal = () => { node.open = true; };
    node.close = () => { node.open = false; };
  }
  return node;
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'frontend/js/booking-qr.js'), 'utf8'), { window, document, URL });
const booking = { id: 25, booking_code: '<img src=x onerror=alert(1)>', total_price: '157500.00', payment_status: 'unpaid', status: 'pending', payment_method: 'bank_transfer', payment_qr: { amount: 157500, bank_name: 'BIDV', account_number: '8888444265', transfer_content: 'DABCLEAN TEST', qr_url: 'https://img.vietqr.io/image/BIDV-8888444265-print.svg?amount=157500&addInfo=DABCLEAN+TEST', demo_mode: false } };
assert.equal(window.DabCleanBookingQr.open({ payment_method: 'cash' }), false);
assert.equal(document.querySelector('dialog'), null);
assert.equal(window.DabCleanBookingQr.open(booking), true);
let dialog = document.querySelector('dialog');
assert.equal(dialog.open, true);
assert.ok(dialog.textContent.includes(booking.booking_code));
assert.equal(dialog.querySelectorAll('img').length, 1, 'booking code renders as text');
assert.ok(dialog.textContent.includes('8888444265'));
assert.ok(dialog.textContent.includes('157.500'));
assert.ok(dialog.textContent.includes('đối soát'));
const image = dialog.querySelector('img');
assert.equal(new URL(image.src).searchParams.get('amount'), '157500');
image.dispatchEvent(new window.Event('error'));
assert.equal(image.hidden, true);
assert.ok(dialog.textContent.includes('Không tải được ảnh QR'));
dialog.querySelector('button').click();
assert.equal(image.hidden, false);
image.dispatchEvent(new window.Event('load'));
assert.ok(dialog.textContent.includes('điền sẵn'));
for (const qr_url of ['javascript:alert(1)', 'https://evil.test/qr?amount=157500', 'https://img.vietqr.io/image/a?amount=1']) {
  window.DabCleanBookingQr.open({ ...booking, payment_qr: { ...booking.payment_qr, qr_url } });
  assert.equal(dialog.querySelector('img'), null);
  assert.ok(dialog.textContent.includes('Không đặt lại đơn'));
}
window.DabCleanBookingQr.open({ ...booking, payment_qr: null });
assert.equal(dialog.querySelector('img'), null);
assert.equal(dialog.querySelectorAll('a').length, 1);
window.DabCleanBookingQr.open({ ...booking, payment_qr: { ...booking.payment_qr, demo_mode: true } });
assert.equal(new URL(dialog.querySelector('img').src).pathname, '/image/BIDV-8888444265-print.svg');
assert.ok(dialog.textContent.includes('Không chuyển tiền thật'));
assert.doesNotMatch(dialog.textContent, /\bdemo\b/i);
assert.ok(!dialog.textContent.includes('Mở thanh toán demo'));
assert.equal(dialog.querySelector('a').getAttribute('href'), 'my-bookings.html');
dialog.close();
const history = document.createElement('section');
assert.equal(window.DabCleanBookingQr.addPaymentButton({ ...booking, payment_status: 'paid' }, history), false);
assert.equal(window.DabCleanBookingQr.addPaymentButton(booking, history), true);
assert.equal(history.firstElementChild.textContent, 'Mã Thanh Toán');
assert.equal(dialog.open, false);
history.firstElementChild.click();
assert.equal(dialog.open, true);
assert.equal(dialog.querySelector('h2').textContent, 'Thanh toán chuyển khoản VietQR');
assert.equal(dialog.querySelector('img').src, booking.payment_qr.qr_url);
assert.equal(dialog.dispatchEvent(new window.Event('cancel', { cancelable: true })), true);
assert.equal(dialog.querySelector('.booking-qr-primary').textContent, 'Đóng');
dialog.querySelector('.booking-qr-primary').click();
assert.equal(dialog.open, false);
assert.match(fs.readFileSync(path.join(root, 'frontend/my-bookings.html'), 'utf8'), /DabCleanBookingQr\.addPaymentButton\(/);
for (const name of ['booking', 'booking-care']) {
  const html = fs.readFileSync(path.join(root, `frontend/${name}.html`), 'utf8');
  assert.match(html, /src="js\/booking-qr.js"/);
  assert.match(html, /DabCleanBookingQr\.open\(/);
  assert.doesNotMatch(html, /VietQR tự động xác nhận/);
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
}
console.log('PASS QR dialog: server amount, correct bank/account, safe DOM, demo notice, image errors/retry, unsafe URLs, no auto-paid action, both booking forms');
