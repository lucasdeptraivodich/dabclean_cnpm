const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
for (const page of ['staff', 'admin']) {
  const source = fs.readFileSync(path.join(root, `frontend/${page}.html`), 'utf8');
  const construction = [...source.matchAll(/const isConstruction = ([^;]+);/g)];
  assert.ok(construction.length);
  for (const match of construction) {
    for (const service_id of [1, 2, 3, 4, 6, 7, 8, '8']) {
      const booking = { service_id, pricing_type: 'm2', package_type: 'hourly' };
      assert.equal(vm.runInNewContext(match[1], { task: booking, b: booking }), false, `${page}: service ${service_id} must not show construction despite legacy defaults`);
    }
    const booking = { service_id: '5', pricing_type: 'm2' };
    assert.equal(vm.runInNewContext(match[1], { task: booking, b: booking }), true, `${page}: real construction must remain visible`);
  }
  for (const match of source.matchAll(/const isCare = ([^;]+);/g)) {
    for (const service_id of [1, 5, 6, 7, 8, '8']) {
      const booking = { service_id, package_type: 'hourly', pricing_type: 'm2' };
      assert.equal(vm.runInNewContext(match[1], { task: booking, b: booking }), [6, 7, 8].includes(Number(service_id)), `${page}: care must follow service identity`);
    }
  }
}
console.log('PASS service panels: care/cleaning legacy defaults excluded from construction; construction preserved; care identity correct');
