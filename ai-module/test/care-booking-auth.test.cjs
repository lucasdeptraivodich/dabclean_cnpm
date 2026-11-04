const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '../..');
const apiSource = fs.readFileSync(path.join(root, 'frontend/api.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'frontend/booking-care.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
const storage = entries => ({ getItem: key => entries[key] || null });

async function submit(serviceId, key, session = false) {
  const { document, window } = parseHTML(html);
  const callbacks = [];
  document.addEventListener = (name, fn) => { if (name === 'DOMContentLoaded') callbacks.push(fn); };
  document.querySelectorAll('input, select, textarea').forEach(el => {
    Object.defineProperty(el, 'value', { configurable: true, writable: true, value: el.getAttribute('value') || '' });
  });
  const values = { 'care-service-select': String(serviceId), 'care-duration-hours': '3', 'care-date': '2026-12-01', 'care-time': '08:30', 'care-recipient-name': 'Người thân', 'care-recipient-age': '70', 'care-address': '25 Duy Tân, Hà Nội', 'care-phone': '0900000000', 'care-payment': 'cash' };
  Object.entries(values).forEach(([id, value]) => { document.getElementById(id).value = value; });
  document.getElementById('care-alert').scrollIntoView = () => {};
  const calls = [];
  const timers = [];
  const context = vm.createContext({ document, window, localStorage: storage(!session && key ? { [key]: 'valid-session' } : {}), sessionStorage: storage(session && key ? { [key]: 'valid-session' } : {}), URLSearchParams, FormData, console, setTimeout: fn => timers.push(fn), fetch: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ success: true, data: url.endsWith('/quote') ? null : { booking_code: 'TEST-CARE' } }) };
  } });
  window.location = { protocol: 'http:', port: '5000', hostname: '127.0.0.1', origin: 'http://127.0.0.1:5000', pathname: '/booking-care.html', search: `?service=${serviceId}` };
  vm.runInContext(apiSource, context);
  callbacks.length = 0; // Exercise the booking initializer independently of navigation UI.
  scripts.forEach(source => vm.runInContext(source, context));
  callbacks.forEach(fn => fn());
  document.getElementById('care-booking-form').dispatchEvent(new window.Event('submit', { cancelable: true }));
  await new Promise(resolve => setImmediate(resolve));
  const bookings = calls.filter(c => c.url.endsWith('/bookings'));
  if (key) {
    assert.equal(bookings.length, 1, `service ${serviceId}, ${key}, session=${session} must submit`);
    assert.equal(bookings[0].options.headers.Authorization, 'Bearer valid-session');
    assert.equal(JSON.parse(bookings[0].options.body).service_id, serviceId);
    assert.match(document.getElementById('care-alert').textContent, /Đặt lịch chăm sóc thành công/);
  } else {
    assert.equal(bookings.length, 0, 'guest must not submit');
    assert.match(document.getElementById('care-alert').textContent, /Vui lòng đăng nhập/);
    timers[0]();
    assert.match(window.location.href, /login\.html\?redirect=/);
    assert.ok(decodeURIComponent(window.location.href).includes(`booking-care.html?service=${serviceId}`));
  }
}
(async () => {
  for (const id of [6, 7, 8]) {
    for (const key of ['dabclean_token', 'cleanova_token']) {
      await submit(id, key);
      await submit(id, key, true);
    }
    await submit(id, null);
  }
  assert.doesNotMatch(apiSource, /dabclean-demo-banner|document\.body\.prepend\(banner\)/, 'no global yellow demo banner');
  console.log('PASS care booking: 12 authenticated submissions, 3 guest rejections/return URLs, no global demo banner');
})().catch(err => { console.error(err); process.exitCode = 1; });
