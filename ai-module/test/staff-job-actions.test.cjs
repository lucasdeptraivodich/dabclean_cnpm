const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { parseHTML } = require('linkedom');
const root = path.resolve(__dirname, '../..');
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const { document, window } = parseHTML('<html><body><div id="tasks-container"><button class="btn-cancel-task" data-id="1">Hủy</button></div></body></html>');
  const create = document.createElement.bind(document);
  document.createElement = tag => {
    const node = create(tag);
    if (tag === 'dialog') { node.showModal = () => { node.open = true; }; node.close = () => { node.open = false; }; }
    return node;
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'frontend/js/staff-job-actions.js'), 'utf8'), { document, window });
  let mutations = 0, cancelled = 0, accepted = 0, failCancel = true;
  let payload;
  const api = {
    getAvailableBookings: async () => ({ success: true, data: [
      { id: 6, status: 'pending', staff_id: null, booking_code: '<img src=x>', address: '<img src=x>', platform_commission: 31500 },
      { id: 1, status: 'confirmed', staff_id: 3 }, { id: 2, status: 'completed' }, { id: 3, status: 'assigned', staff_id: 4 }
    ] }),
    acceptBooking: async id => { assert.equal(id, 6); accepted++; return { success: true }; },
    updateTaskStatus: async (...args) => { mutations++; payload = args; if (failCancel) throw new Error('Đơn đã được cập nhật bởi request khác'); return { success: true }; }
  };
  const actions = window.DabCleanStaffJobs.create({ api, onAccepted: async () => {}, onCancelled: async () => { cancelled++; } });
  await actions.refresh();
  const section = document.querySelector('section');
  assert.equal(section.querySelectorAll('article').length, 1);
  assert.equal(section.querySelector('img'), null);
  section.querySelector('button').click();
  await tick();
  assert.equal(accepted, 1);
  document.querySelector('.btn-cancel-task').click();
  const dialog = document.querySelector('dialog');
  assert.equal(dialog.open, true, 'click opens a visible form without native prompt');
  const form = dialog.querySelector('form');
  const reason = dialog.querySelector('textarea');
  const submit = () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  reason.value = '  a  ';
  submit(); await tick();
  assert.equal(mutations, 0);
  reason.value = 'x'.repeat(501);
  submit(); await tick();
  assert.equal(mutations, 0);
  reason.value = '  Khách yêu cầu đổi lịch  ';
  submit(); await tick();
  assert.equal(mutations, 1);
  assert.equal(dialog.open, true);
  assert.ok(dialog.textContent.includes('Đơn đã được cập nhật'));
  assert.equal(form.querySelector('[type="submit"]').disabled, false);
  failCancel = false;
  submit(); submit(); await tick();
  assert.equal(mutations, 2, 'double submit sends only one mutation');
  assert.equal(JSON.stringify(payload), JSON.stringify([1, 'cancelled', '', 'Khách yêu cầu đổi lịch']));
  assert.equal(cancelled, 1);
  assert.equal(dialog.open, false);
  const html = fs.readFileSync(path.join(root, 'frontend/staff.html'), 'utf8');
  assert.equal(html.includes("window.prompt('Nhập lý do hủy công việc"), false);
  assert.match(html, /const canCancel = \['assigned', 'confirmed'\]/);
  console.log('PASS available jobs DOM/XSS/accept, cancellation dialog, trimmed reason limits, API errors, duplicate submit, reload callback');
})().catch(err => { console.error(err); process.exitCode = 1; });
