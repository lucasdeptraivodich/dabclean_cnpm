const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGeocoder } = require('./src/services/geocodingService');
test('validate input before calling provider', async () => {
 const service = createGeocoder({ fetchImpl: () => { throw Error('must not fetch'); } });
 for (const q of [null, {}, '', 'a', 'x'.repeat(256)]) await assert.rejects(service.search(q), e => e.statusCode === 400);
});
test('cache, global limit, bounded output and request identity', async () => {
 let calls = 0, now = 10000;
 const service = createGeocoder({ now: () => now, fetchImpl: async (url, options) => {
 calls++; assert.match(options.headers['User-Agent'], /DabClean/);
 assert.equal(new URL(url).searchParams.get('countrycodes'), 'vn');
 return { ok: true, json: async () => [{ lat: '21.02', lon: '105.83', display_name: 'Hà Nội' }, { lat: 'NaN', lon: '0' }] };
 } });
 const first = await service.search('Hoàn Kiếm, Hà Nội');
 assert.equal(first.length, 1); assert.equal(first[0].latitude, 21.02);
 await service.search('Hoàn Kiếm, Hà Nội'); assert.equal(calls, 1);
 await assert.rejects(service.search('Đống Đa, Hà Nội'), e => e.statusCode === 429);
 now += 1100; await service.search('Đống Đa, Hà Nội'); assert.equal(calls, 2);
});
test('upstream errors do not expose internal messages', async () => {
 const service = createGeocoder({ fetchImpl: async () => { throw Error('secret'); } });
 await assert.rejects(service.search('Hà Nội'), e => e.statusCode === 503 && !e.message.includes('secret'));
});

test('Vietnamese address fallback is bounded, rate spaced and clearly approximate', async () => {
 let time = 0; const queries = [];
 const service = createGeocoder({ now: () => time, sleep: async ms => { time += ms; }, fetchImpl: async url => {
  queries.push({ q: url.searchParams.get('q'), time });
  return { ok: true, json: async () => queries.length < 3 ? [] : [{ lat: '21.1', lon: '105.9', display_name: 'Phù Đổng, Hà Nội', address: { city: 'Hà Nội' } }] };
 } });
 const result = await service.search('số 4 ngõ 106 phù đổng hà nội');
 assert.equal(queries.length, 3); assert.match(queries[2].q, /^phù đổng, Hà Nội$/i);
 assert.ok(queries[1].time - queries[0].time >= 1100);
 assert.ok(queries[2].time - queries[1].time >= 1100);
 assert.equal(result[0].match_level, 'area'); assert.equal(result[0].approximate, true);
});
test('reject wrong-city results instead of placing a misleading pin', async () => {
 let time = 0;
 const service = createGeocoder({ now: () => time, sleep: async ms => { time += ms; }, fetchImpl: async () => ({ ok: true,
  json: async () => [{ lat: '10.8', lon: '106.7', display_name: 'Phù Đổng, Hồ Chí Minh', address: { city: 'Hồ Chí Minh' } }] }) });
 assert.deepEqual(await service.search('số 4 ngõ 106 phù đổng hà nội'), []);
});
