const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(searchFetch) {
 const elements = [];
 class Element {
  constructor() { this.events = {}; this.children = []; this.value = ''; }
  append(e) { this.children.push(e); }
  setAttribute() {} insertAdjacentElement() {} focus() {}
  addEventListener(name, callback) { this.events[name] = callback; }
  replaceChildren() { this.children = []; }
  closest() { return form; }
 }
 const form = new Element(), address = new Element();
 const window = { L: {}, isSecureContext: true };
 let calls = 0;
 const context = { window, AbortSignal,
  localStorage: { getItem: () => null }, sessionStorage: { getItem: () => null },
  document: { getElementById: id => id === 'booking-address' ? address : null,
   createElement: () => { const e = new Element(); elements.push(e); return e; } },
  fetch: async (url, options) => {
   if (url.endsWith('/config')) return { ok: true, json: async () => ({}) };
   calls++; return searchFetch(url, options);
  }
 };
 vm.runInNewContext(fs.readFileSync(require.resolve('../frontend/js/booking-location'), 'utf8'), context);
 return { address, form, window, calls: () => calls, find: text => elements.find(e => e.textContent === text) };
}
const response = label => ({ ok: true, json: async () => ({ data: [{ latitude: 21.03, longitude: 105.85, label }] }) });
test('address blur searches once, pins candidate and requires confirmation before submit', async () => {
 const ui = setup(async (url, options) => {
  assert.equal(options.method, 'POST'); assert.equal(JSON.parse(options.body).address, 'Hoàn Kiếm, Hà Nội');
  return response('<img src=x onerror=alert(1)>');
 });
 ui.address.value = 'Hoàn Kiếm, Hà Nội'; await ui.address.events.blur();
 assert.equal(ui.calls(), 1); assert.equal(ui.window.BookingLocation.getValue().latitude, undefined);
 let blocked = false;
 ui.form.events.submit({ preventDefault() { blocked = true; }, stopImmediatePropagation() {} });
 assert.equal(blocked, true);
 assert.ok(ui.find('<img src=x onerror=alert(1)>')); // Untrusted provider text is textContent.
 ui.find('Xác nhận vị trí này').events.click();
 assert.equal(ui.window.BookingLocation.getValue().latitude, 21.03);
 await ui.address.events.blur(); assert.equal(ui.calls(), 1);
 ui.address.events.input(); assert.equal(ui.window.BookingLocation.getValue().latitude, undefined);
});
test('late geocoding result cannot overwrite a changed address', async () => {
 let resolve;
 const ui = setup(() => new Promise(done => { resolve = done; }));
 ui.address.value = 'Hoàn Kiếm, Hà Nội'; const request = ui.address.events.blur();
 ui.address.value = 'Đống Đa, Hà Nội'; ui.address.events.input();
 resolve(response('old result')); await request;
 assert.equal(ui.find('old result'), undefined);
 assert.equal(ui.window.BookingLocation.getValue().latitude, undefined);
});
test('no results and provider failure leave manual booking available', async () => {
 for (const result of [{ ok: true, json: async () => ({ data: [] }) },
  { ok: false, json: async () => ({ message: 'Thử lại sau' }) }]) {
  const ui = setup(async () => result); ui.address.value = 'Hà Nội'; await ui.address.events.blur();
  let blocked = false;
  ui.form.events.submit({ preventDefault() { blocked = true; }, stopImmediatePropagation() {} });
  assert.equal(blocked, false); assert.equal(ui.window.BookingLocation.getValue().latitude, undefined);
 }
});

test('area-only result warns about missing house number and preserves typed address', async () => {
 const ui = setup(async () => ({ ok: true, json: async () => ({ data: [{ latitude: 21.05, longitude: 105.95,
  label: 'Phù Đổng, Hà Nội', approximate: true, match_level: 'area' }] }) }));
 ui.address.value = 'số 4 ngõ 106 phù đổng hà nội'; await ui.address.events.blur();
 assert.ok(ui.find('Phù Đổng, Hà Nội · Vị trí gần đúng'));
 assert.ok(ui.find('Chỉ tìm thấy khu vực gần địa chỉ, chưa xác định được số nhà/ngõ. Hãy phóng to và kéo ghim tới đúng nhà rồi xác nhận.'));
 assert.equal(ui.address.value, 'số 4 ngõ 106 phù đổng hà nội');
 assert.equal(ui.window.BookingLocation.getValue().latitude, undefined);
});
