(() => {
  const api = window.DabCleanAPI;
  const root = `${api.BASE_URL}/demo/features`;
  function element(tag, text, parent) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  }
  async function request(path, body) {
    const response = await fetch(root + path, {
      headers: { Authorization: 'Bearer ' + (api.auth.getToken() || ''), 'Content-Type': 'application/json' },
      ...(body && { method: 'POST', body: JSON.stringify(body) })
    });
    if (response.status === 204) return;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Tính năng chưa khả dụng.');
    return payload.data;
  }
  function profile(parent, worker) {
    element('strong', worker.name, parent);
    element('p', `${worker.experience} · ${worker.completedJobs} ca hoàn thành`, parent);
    element('p', worker.rating == null ? 'Chưa có đánh giá nhân viên' : `Đánh giá ${worker.rating}/5`, parent);
    element('p', worker.faceVerified ? 'Đã xác thực khuôn mặt (mô phỏng)' : 'Chưa xác thực khuôn mặt', parent);
  }
  function favoriteButton(parent, worker, update) {
    const button = element('button', worker.favorite ? 'Bỏ yêu thích' : 'Yêu thích', parent);
    button.type = 'button';
    button.className = 'btn btn-outline btn-sm';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await request('/staff-directory/favorite', { staffId: worker.id, favorite: !worker.favorite });
        worker.favorite = !worker.favorite;
        button.textContent = worker.favorite ? 'Bỏ yêu thích' : 'Yêu thích';
        update?.();
      } catch (err) {
        button.textContent = err.message;
      } finally { button.disabled = false; }
    });
  }
  function renderBookingChoice(panel, workers) {
    const label = element('label', 'Nhân viên ưu tiên', panel);
    label.htmlFor = 'preferred-staff';
    const select = element('select', '', panel);
    select.id = 'preferred-staff';
    select.className = 'form-control';
    element('option', 'Bất kỳ nhân viên nào', select).value = '';
    workers.sort((a, b) => Number(b.favorite) - Number(a.favorite) || Number(b.served) - Number(a.served));
    for (const worker of workers) {
      element('option', worker.name + (worker.favorite ? ' · Yêu thích' : worker.served ? ' · Từng phục vụ' : ''), select).value = worker.id;
    }
    element('p', 'Nhân viên bạn chọn có 5 phút ưu tiên nhận ca.', panel);
    const details = element('div', '', panel);
    select.addEventListener('change', () => {
      details.replaceChildren();
      const worker = workers.find(item => item.id === Number(select.value));
      if (!worker) return;
      profile(details, worker);
      favoriteButton(details, worker);
    });
  }
  function renderDirectory(panel, workers) {
    const render = () => {
      panel.replaceChildren();
      for (const [title, matches] of [
        ['Nhân viên đã từng làm cho mình', workers.filter(worker => worker.served)],
        ['Nhân viên yêu thích', workers.filter(worker => worker.favorite)]
      ]) {
        const group = element('details', '', panel);
        element('summary', `${title} (${matches.length})`, group);
        if (!matches.length) element('p', 'Chưa có nhân viên trong danh sách.', group);
        for (const worker of matches) {
          const card = element('div', '', group);
          profile(card, worker);
          favoriteButton(card, worker, () => {
            const expanded = [...panel.querySelectorAll('details')].map(section => section.open);
            render();
            panel.querySelectorAll('details').forEach((section, index) => { section.open = expanded[index]; });
          });
        }
      }
    };
    render();
  }
  window.DabCleanStaffDirectory = {
    preferredId: () => Number(document.getElementById('preferred-staff')?.value) || null,
    async choosePrebooking(id, knownBusy = false) {
      if (!id) return false;
      const workers = knownBusy ? [] : await request('/staff-directory');
      if (!knownBusy && !workers.find(worker => worker.id === id)?.busy) return false;
      return new Promise(resolve => {
        const dialog = element('dialog', '', document.body);
        dialog.className = 'booking-qr-dialog';
        dialog.setAttribute('aria-label', 'Nhân viên đang bận');
        element('h2', 'Nhân viên được chọn đang có ca dọn khác', dialog);
        element('p', 'Bạn có thể chọn nhân viên khác hoặc đặt trước và chờ phản hồi trong 30 phút.', dialog);
        const finish = value => {
          dialog.close();
          dialog.remove();
          if (value === null) {
            const select = document.getElementById('preferred-staff');
            if (select) {
              select.value = '';
              select.dispatchEvent(new Event('change'));
              select.focus({ preventScroll: true });
            }
          }
          resolve(value);
        };
        for (const [label, value] of [['Chọn Nhân Viên Khác', null], ['Đặt Lịch Trước', true]]) {
          const button = element('button', label, dialog);
          button.type = 'button';
          button.className = 'booking-qr-primary';
          button.addEventListener('click', () => finish(value));
        }
        dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
        dialog.showModal();
      });
    },
    orderProfiles(panel, profiles) {
      if (!profiles?.assigned && !profiles?.requested) return;
      if (profiles.assigned) {
        element('h3', 'Nhân viên phụ trách', panel);
        profile(panel, profiles.assigned);
        if (typeof profiles.assigned.favorite === 'boolean') favoriteButton(panel, profiles.assigned);
      } else {
        element('h3', 'Nhân viên ưu tiên · đang chờ nhận ca', panel);
        profile(panel, profiles.requested);
      }
      if (profiles.prebook) {
        const { status, reason } = profiles.prebook;
        const labels = { waiting: 'Đang chờ nhân viên xác nhận', approved: 'Nhân Viên Đã Xác Nhận Lịch Hẹn · đang chờ xong ca hiện tại',
          confirmed: 'Nhân Viên Đã Xác Nhận Lịch Hẹn', declined: 'Lịch đặt trước chưa được nhận' };
        element('p', labels[status], panel);
        if (reason) element('p', reason, panel);
      }
    }
  };
  async function init() {
    if (!api.auth.getToken()) return;
    const chooser = document.getElementById('staff-choice');
    const directory = document.getElementById('staff-directory');
    const face = document.getElementById('staff-face-check');
    try {
      if (chooser || directory) {
        const workers = await request('/staff-directory');
        if (chooser) { renderBookingChoice(chooser, workers); chooser.hidden = false; }
        if (directory) { renderDirectory(directory, workers); directory.hidden = false; }
      }
      if (face) {
        const result = await request('/face-check');
        face.hidden = false;
        element('h3', 'Xác thực khuôn mặt nhân viên', face);
        element('p', 'Mô phỏng xác thực hồ sơ. Không dùng camera hoặc lưu ảnh khuôn mặt.', face);
        const status = element('p', result.verifiedAt ? 'Đã xác thực (mô phỏng)' : 'Chưa xác thực', face);
        const button = element('button', 'Mô phỏng xác thực', face);
        button.type = 'button';
        button.className = 'btn btn-outline';
        button.disabled = Boolean(result.verifiedAt);
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const updated = await request('/face-check', {});
            status.textContent = updated.verifiedAt ? 'Đã xác thực (mô phỏng)' : 'Chưa xác thực';
          } catch (err) {
            status.textContent = err.message;
            button.disabled = false;
          }
        });
      }
    } catch {
      // These sections are available only to eligible accounts in demo mode.
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
