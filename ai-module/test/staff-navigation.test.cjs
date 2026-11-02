// Uses this package's existing linkedom dev dependency to exercise frontend DOM safely.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'frontend/js/staff-navigation.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup(response, geo) {
  const { document, window } = parseHTML('<html><body><button data-task-navigation="10">Map</button></body></html>');
  const originalCreate = document.createElement.bind(document);
  document.createElement = tag => {
    const node = originalCreate(tag);
    if (tag === 'dialog') {
      node.showModal = () => { node.open = true; };
      node.close = () => { node.open = false; };
    }
    return node;
  };
  let calls = 0;
  vm.runInNewContext(source, { document, URL, navigator: { geolocation: geo }, DabCleanAPI: { staff: { getTaskNavigation: async () => { calls++; return typeof response === 'function' ? response() : response; } } } });
  assert.equal(calls, 0, 'no destination lookup before user action');
  const button = document.querySelector('[data-task-navigation]');
  button.dispatchEvent(new window.Event('click', { bubbles: true }));
  await tick();
  return { document, window, button, dialog: document.querySelector('dialog') };
}
(async () => {
  const address = '<img src=x onerror=alert(1)> & 12 Nguyễn Trãi, Hà Nội';
  let geoCalls = 0;
  const geo = { getCurrentPosition(success) { geoCalls++; success({ coords: { latitude: 10.5, longitude: 106.5, accuracy: 24 } }); } };
  const ui = await setup({ success: true, data: { address } }, geo);
  assert.equal(geoCalls, 0, 'no automatic location permission');
  assert.equal(ui.document.querySelector('img'), null, 'address must render as text');
  assert.ok(ui.dialog.textContent.includes(address));
  const link = ui.dialog.querySelector('a');
  let route = new URL(link.getAttribute('href'));
  assert.equal(route.searchParams.get('destination'), address);
  assert.equal(route.searchParams.has('origin'), false);
  assert.equal(route.searchParams.get('api'), '1');
  const map = new URL(ui.dialog.querySelector('iframe').src);
  assert.equal(map.searchParams.get('q'), address);
  ui.dialog.querySelectorAll('button')[1].click();
  route = new URL(link.getAttribute('href'));
  assert.equal(geoCalls, 1);
  assert.equal(route.searchParams.get('origin'), '10.5,106.5');
  assert.equal(route.searchParams.get('destination'), address, 'staff GPS cannot replace destination');
  ui.dialog.querySelector('button').click();
  assert.equal(ui.dialog.querySelector('iframe'), null);
  const denied = await setup({ success: true, data: { address: '12 Hà Nội' } }, { getCurrentPosition(ok, fail) { fail({ code: 1 }); } });
  denied.dialog.querySelectorAll('button')[1].click();
  assert.ok(denied.dialog.textContent.includes('Không lấy được GPS'));
  assert.equal(new URL(denied.dialog.querySelector('a').getAttribute('href')).searchParams.has('origin'), false);
  const unsupported = await setup({ success: true, data: { address: '12 Hà Nội' } });
  unsupported.dialog.querySelectorAll('button')[1].click();
  assert.ok(unsupported.dialog.textContent.includes('không hỗ trợ GPS'));
  const failed = await setup({ success: false, message: 'Đơn chưa được nhận' });
  assert.equal(failed.dialog.querySelector('iframe'), null);
  assert.ok(failed.dialog.textContent.includes('Đơn chưa được nhận'));
  let resolve;
  const stale = await setup(() => new Promise(r => { resolve = r; }));
  stale.dialog.querySelector('button').click();
  resolve({ success: true, data: { address: 'Late address' } });
  await tick();
  assert.equal(stale.dialog.querySelector('iframe'), null, 'closed modal cannot be repopulated');
  const booking = fs.readFileSync(path.join(root, 'frontend/booking.html'), 'utf8');
  assert.doesNotMatch(booking, /navigator\.geolocation|booking-lat|booking-lng|booking-map|leaflet/i);
  assert.match(booking, /id="booking-address"/);
  const staff = fs.readFileSync(path.join(root, 'frontend/staff.html'), 'utf8');
  assert.match(staff, /\['confirmed', 'arrived', 'in_progress'\]\.includes\(task.status\)[\s\S]*?data-task-navigation/);
  assert.match(staff, /navigator\.geolocation\.getCurrentPosition/, 'photo GPS remains');
  for (const name of ['booking', 'staff']) {
    const html = fs.readFileSync(path.join(root, `frontend/${name}.html`), 'utf8');
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
  console.log('PASS navigation DOM: XSS, map URL, GPS origin, denied/unsupported GPS, stale response, customer removal, staff gating, inline syntax');
})().catch(err => { console.error(err); process.exitCode = 1; });
