const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateBookingLocation: validate } = require('./src/utils/bookingLocation');
test('optional GPS and valid coordinate boundaries including zero', () => {
  assert.deepEqual(validate({}), { latitude: null, longitude: null, location_accuracy: null });
  for (const [latitude, longitude] of [[0, 0], [-90, -180], [90, 180], [10.77, 106.7]]) {
    assert.deepEqual(validate({ latitude, longitude, location_accuracy: 12 }), { latitude, longitude, location_accuracy: 12 });
  }
});
test('reject malformed pairs and accuracy as HTTP 400', () => {
  for (const body of [
    { latitude: 1 }, { longitude: 2 }, { latitude: null, longitude: 2 },
    { latitude: '1', longitude: 2 }, { latitude: true, longitude: 2 },
    { latitude: [], longitude: 2 }, { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 }, { latitude: NaN, longitude: 0 },
    { latitude: Infinity, longitude: 0 }, { location_accuracy: 5 },
    { latitude: 0, longitude: 0, location_accuracy: -1 },
    { latitude: 0, longitude: 0, location_accuracy: '10' }
  ]) assert.throws(() => validate(body), error => error.statusCode === 400);
});
test('booking model inserts GPS in the same parameterized INSERT, preserves old clients', async () => {
  let sql, params;
  const context = { module: { exports: {} }, require: () => ({ query: async (query, values) => {
    sql = query; params = values; return { insertId: 42 };
  } }) };
  vm.runInNewContext(fs.readFileSync(require.resolve('./src/models/bookingModel'), 'utf8'), context);
  const model = context.module.exports;
  assert.equal(await model.create({ latitude: 0, longitude: 106.7, location_accuracy: 8 }), 42);
  assert.equal((sql.match(/\?/g) || []).length, params.length);
  assert.match(sql, /addon_amount, latitude, longitude, location_accuracy/);
  assert.deepEqual(Array.from(params.slice(-3)), [0, 106.7, 8]);
  await model.create({});
  assert.deepEqual(Array.from(params.slice(-3)), [null, null, null]);
});
test('frontend GPS permission, denied access, address reset and stale GPS callback', () => {
  const elements = [];
  class Element {
    constructor() { this.style = {}; this.events = {}; this.value = ''; this.children = []; }
    setAttribute() {}
    append(element) { this.children.push(element); }
    addEventListener(name, callback) { this.events[name] = callback; }
    insertAdjacentElement() {}
    closest() { return null; }
    replaceChildren() { this.children = []; }
  }
  const address = new Element();
  const document = { getElementById: id => id === 'booking-address' ? address : null,
    createElement: () => { const e = new Element(); elements.push(e); return e; } };
  let success, failure;
  const window = { isSecureContext: true, L: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../frontend/js/booking-location.js'), 'utf8'), {
    window, document, navigator: { geolocation: { getCurrentPosition: (ok, bad, options) => {
      assert.equal(options.enableHighAccuracy, true); success = ok; failure = bad;
    } } }, fetch: async () => ({ ok: true, json: async () => ({ apiKey: '' }) })
  });
  const locate = elements.find(e => e.textContent === 'Lấy vị trí hiện tại');
  const status = elements.find(e => e.events && e.textContent?.startsWith('Bạn cũng có thể'));
  const confirm = elements.find(e => e.textContent === 'Xác nhận vị trí này');
  locate.events.click(); success({ coords: { latitude: 0, longitude: 106.7, accuracy: 8 } });
  assert.equal(window.BookingLocation.getValue().latitude, undefined);
  confirm.events.click();
  assert.equal(window.BookingLocation.getValue().latitude, 0);
  address.events.input(); assert.equal(window.BookingLocation.getValue().latitude, undefined);
  locate.events.click(); address.events.input(); success({ coords: { latitude: 1, longitude: 2, accuracy: 5 } });
  assert.equal(window.BookingLocation.getValue().latitude, undefined);
  locate.events.click(); failure({ code: 1 }); assert.match(status.textContent, /chưa cho phép/);
});


function loadController(booking) {
  const context = { module: { exports: {} }, require: name => {
    if (name === '../utils/bookingLocation') return { validateBookingLocation: validate };
    if (name === '../models/bookingModel') return { getById: async () => booking };
    if (name === 'crypto') return require('crypto');
    return {};
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('./src/controllers/bookingController'), 'utf8'), context);
  return context.module.exports;
}
test('controller rejects malformed GPS before creating any booking', async () => {
  const controller = loadController(null);
  let error;
  await controller.createBooking({ body: { latitude: '10', longitude: 106 }, user: { id: 1 } }, {}, err => { error = err; });
  assert.equal(error.statusCode, 400);
});
test('booking coordinates are accessible only to owner/admin via customer detail controller', async () => {
  const booking = { id: 1, user_id: 7, latitude: 10.7, longitude: 106.7 };
  const controller = loadController(booking);
  for (const [user, expected] of [[{ id: 7, role: 'customer' }, 200], [{ id: 8, role: 'admin' }, 200],
    [{ id: 8, role: 'customer' }, 403], [{ id: 8, role: 'staff' }, 403]]) {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await controller.getBookingDetail({ params: { id: '1' }, user }, response, err => { throw err; });
    assert.equal(response.code, expected);
    if (expected === 200) assert.equal(response.body.data.latitude, 10.7);
    else assert.equal(response.body.data, undefined);
  }
});
