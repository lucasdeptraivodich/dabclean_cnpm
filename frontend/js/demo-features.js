(() => {
  const api = window.DabCleanAPI;
  const byId = id => document.getElementById(id);
  const order = byId('order');
  const notice = byId('notice');
  const actions = byId('actions');
  let state;
  let nextOrder;
  let activeOrder;
  let trackingId;
  let pendingLocation;
  let loading = false;
  let refreshPending = false;
  const photoUrls = new Set();
  const money = amount => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  const stage = {
    pending: 'Chờ nhận', assigned: 'Đã giao', confirmed: 'Đã xác nhận', arrived: 'Đã đến',
    in_progress: 'Đang làm', completed: 'Hoàn thành', cancelled: 'Đã hủy'
  };
  function element(tag, text, parent) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    parent?.append(node);
    return node;
  }
  async function request(path = '', data) {
    const response = await fetch(`${api.BASE_URL}/demo/features${path}`, {
      headers: { Authorization: `Bearer ${api.auth.getToken() || ''}`, 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { method: 'POST', body: JSON.stringify(data) })
    });
    if (response.status === 204) return;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'Cần đăng nhập trên máy chủ đang chạy chế độ demo.');
    return result.data;
  }
  async function perform(operation) {
    try {
      await operation();
      notice.textContent = 'Đã cập nhật dữ liệu demo.';
      await refresh(true);
    } catch (err) {
      notice.textContent = err.message;
    }
  }
  function button(parent, label, fn) {
    const control = element('button', label, parent);
    control.type = 'button';
    control.addEventListener('click', async () => {
      control.disabled = true;
      try { await fn(); } finally { control.disabled = false; }
    });
    return control;
  }
  function form(parent, fields, label, submit) {
    const group = element('form', null, parent);
    const inputs = fields.map(([caption, type, options]) => {
      const fieldLabel = element('label', caption, group);
      if (options) {
        const select = element('select', null, fieldLabel);
        for (const [value, label] of options) element('option', label, select).value = value;
        return select;
      }
      const input = element('input', null, fieldLabel);
      input.type = type;
      input.required = true;
      if (type === 'number') { input.min = '0'; input.step = '1'; }
      else if (type === 'file') input.accept = 'image/jpeg,image/png,video/mp4,video/webm';
      else input.maxLength = 500;
      return input;
    });
    const send = element('button', label, group);
    send.type = 'submit';
    group.addEventListener('submit', async event => {
      event.preventDefault();
      send.disabled = true;
      try { await submit(...inputs.map(input => input.type === 'number' ? input.valueAsNumber : input.type === 'file' ? input.files[0] : input.value)); }
      finally { send.disabled = false; }
    });
  }
  function bookingAction(row, action, body = {}) {
    return perform(() => request(`/bookings/${row.id}/${action}`, body));
  }
  function photoInput(row) {
    const input = element('input', null, element('label', 'Ảnh đính kèm', actions));
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    button(actions, 'Gửi ảnh', async () => {
      const file = input.files[0];
      if (!file || file.size > 5000000) {
        notice.textContent = 'Chọn một ảnh JPEG, PNG hoặc WebP tối đa 5 MB.';
        return;
      }
      try {
        const image = await createImageBitmap(file);
        let photo;
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 400 / Math.max(image.width, image.height));
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          photo = canvas.toDataURL('image/jpeg', 0.55);
        } finally { image.close(); }
        await bookingAction(row, 'message', { photo });
      } catch {
        notice.textContent = 'Không đọc được ảnh. Hãy chọn ảnh khác.';
      }
    });
  }
  function renderFinance() {
    const panel = byId('finance');
    panel.hidden = false;
    element('h2', 'Xuất sổ cái và chiết khấu', panel);
    form(panel, [['Từ ngày', 'date'], ['Đến ngày', 'date'], ['Loại báo cáo', 'select', [
      ['ledger', 'Sổ cái ví'], ['commission', 'Chiết khấu nhận ca']
    ]]],
      'Tải CSV cho Excel', async (from, to, kind) => {
        try {
          const query = new URLSearchParams({ from, to });
          const response = await fetch(`${api.BASE_URL}/demo/features/finance/${kind}?${query}`, {
            headers: { Authorization: `Bearer ${api.auth.getToken() || ''}` }
          });
          if (!response.ok) throw new Error('Không xuất được báo cáo. Kiểm tra khoảng ngày và quyền quản trị.');
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = url;
          link.download = `dabclean-${kind}-${from}-${to}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) { notice.textContent = err.message; }
      });
  }
  function signature(row) {
    const canvas = element('canvas', null, actions);
    canvas.width = 420;
    canvas.height = 140;
    canvas.setAttribute('aria-label', 'Khung chữ ký nghiệm thu');
    const ctx = canvas.getContext('2d');
    const strokes = row.signature?.strokes || [];
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const line of strokes) {
        ctx.beginPath();
        line.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x * canvas.width, y * canvas.height));
        ctx.stroke();
      }
    }
    draw();
    if (row.signature) return;
    let stroke;
    const addPoint = event => {
      const box = canvas.getBoundingClientRect();
      const clamp = n => Math.max(0, Math.min(1, n));
      if (stroke.length < 500) stroke.push([clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height)]);
      draw();
    };
    canvas.addEventListener('pointerdown', event => {
      if (stroke || strokes.length >= 30) return;
      canvas.setPointerCapture(event.pointerId);
      stroke = [];
      strokes.push(stroke);
      addPoint(event);
    });
    canvas.addEventListener('pointermove', event => { if (stroke) addPoint(event); });
    for (const name of ['pointerup', 'pointercancel']) canvas.addEventListener(name, () => { stroke = null; });
    button(actions, 'Xóa chữ ký', () => { strokes.length = 0; draw(); });
    button(actions, 'Lưu nghiệm thu', () => bookingAction(row, 'signature', { strokes: strokes.filter(line => line.length >= 2) }));
  }
  function stopTracking() {
    if (trackingId != null) navigator.geolocation.clearWatch(trackingId);
    trackingId = null;
  }
  async function hideLocation(row) {
    stopTracking();
    await pendingLocation?.catch(() => {});
    return bookingAction(row, 'stopLocation');
  }
  function tracking(row) {
    if (!navigator.geolocation) { notice.textContent = 'Thiết bị không hỗ trợ GPS.'; return; }
    if (trackingId != null) {
      return hideLocation(row);
    }
    let sentAt = 0;
    trackingId = navigator.geolocation.watchPosition(async ({ coords }) => {
      if (trackingId == null || Date.now() - sentAt < 3000) return;
      sentAt = Date.now();
      try {
        pendingLocation = request(`/bookings/${row.id}/location`, { latitude: coords.latitude, longitude: coords.longitude });
        await pendingLocation;
        notice.textContent = 'Đang chia sẻ GPS của ca này. Bấm lại nút GPS để dừng.';
      } catch (err) {
        stopTracking();
        notice.textContent = err.message;
      }
    }, err => { stopTracking(); notice.textContent = err.message; });
  }
  function renderActions(row) {
    clearPhotos();
    actions.replaceChildren();
    if (!row) return;
    const { role } = state;
    if (row.messages) {
      form(actions, [['Tin nhắn', 'text']], 'Gửi', text => bookingAction(row, 'message', { text }));
      photoInput(row);
    }
    if (role === 'customer') {
      if (row.canRepeat) {
        form(actions, [['Ngày cho lần đặt tiếp theo', 'date']], 'Đặt lại theo tuần', date => perform(async () => {
          const booking = await request(`/repeat/${row.id}`, { date });
          nextOrder = String(booking.id);
        }));
      }
      if (!['waiting', 'declined'].includes(row.prebook?.status) &&
        ['pending', 'assigned', 'confirmed'].includes(row.status) && row.paymentStatus === 'unpaid' &&
        ['bank_transfer', 'momo', 'vnpay'].includes(row.paymentMethod)) {
        button(actions, 'Xác nhận thanh toán giả lập', () => bookingAction(row, 'pay'));
      }
      if (row.status === 'pending' && row.prebook?.status === 'declined') {
        button(actions, 'Tự Động Điều Phối Nhân Viên', () => bookingAction(row, 'redispatch'));
        button(actions, 'Tự Chọn Nhân Viên', async () => {
          try {
            const candidates = (await request('/staff-directory')).filter(worker => !worker.busy && worker.id !== row.prebook.staffId);
            if (!candidates.length) { notice.textContent = 'Chưa có nhân viên khác đang rảnh.'; return; }
            if (actions.querySelector('[data-prebook-reselect]')) return;
            const panel = element('div', '', actions);
            panel.dataset.prebookReselect = 'true';
            form(panel, [['Chọn nhân viên', 'select', candidates.map(worker => [worker.id, worker.name])]],
              'Gửi lịch hẹn', id => bookingAction(row, 'reselect', { staffId: Number(id) }));
          } catch (err) { notice.textContent = err.message; }
        });
        form(actions, [['Lý do hủy đặt lịch', 'text']], 'Hủy Đặt Lịch',
          reason => perform(() => api.bookings.cancel(row.id, reason)));
      }
      if (!row.dispute && ['confirmed', 'arrived', 'in_progress', 'completed', 'cancelled'].includes(row.status)) {
        form(actions, [['Nội dung khiếu nại', 'text'], ['Ảnh hoặc video bằng chứng (tối đa 1 MB)', 'file']], 'Gửi khiếu nại',
          (reason, file) => perform(async () => {
            if (!file || file.size > 1000000) throw new Error('Chọn ảnh hoặc video tối đa 1 MB.');
            const evidence = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(new Error('Không đọc được tệp bằng chứng.'));
              reader.readAsDataURL(file);
            });
            await request(`/bookings/${row.id}/dispute`, { reason, evidence });
          }));
      }
    }
    if (role === 'staff' && row.messages) {
      button(actions, 'Bật / dừng chia sẻ GPS', () => tracking(row));
      button(actions, 'Gửi vị trí mẫu', () => bookingAction(row, 'location', { latitude: 21.029, longitude: 105.855 }));
      button(actions, 'Ẩn vị trí đã gửi', () => hideLocation(row));
    }
    if (role === 'staff' && row.dispute?.status === 'open') {
      form(actions, [['Bản tường trình', 'text']], 'Gửi bản tường trình',
        statement => bookingAction(row, 'statement', { statement }));
    }
    if (row.signature || (role === 'staff' && ['in_progress', 'completed'].includes(row.status))) {
      const heading = element('h2', row.signature ? 'Chữ ký đã lưu' : 'Ký nghiệm thu demo', actions);
      heading.id = 'nghiem-thu';
      signature(row);
    }
    if (role === 'admin') {
      if (row.status === 'pending' && row.staffId == null && !row.dispatch) {
        button(actions, 'Mở phân ca theo khoảng cách', () => bookingAction(row, 'dispatch'));
      }
      if (row.dispatch) {
        const list = element('ol', null, actions);
        for (const worker of row.dispatch.candidates) {
          const priority = row.dispatch.priorityIds.includes(worker.id) ? ' · ưu tiên 5 phút' : '';
          element('li', `${worker.name} · ${worker.km.toFixed(1)} km${priority}`, list);
        }
      }
      if (row.dispute?.status === 'open') {
        form(actions, [['Phán quyết', 'select', [['dismissed', 'Khiếu nại không có căn cứ'], ['staff_fault', 'Xác nhận lỗi nhân viên']]],
          ['Giải trình', 'text'], ['Thiệt hại (VND, nhập 0 nếu bác khiếu nại)', 'number']],
          'Lưu phán quyết', (decision, note, amount) => bookingAction(row, 'verdict', { decision, note, amount }));
      }
      if (row.dispute) {
        if (row.dispute.statement) element('p', `Bản tường trình: ${row.dispute.statement}`, actions);
        const evidence = row.dispute.evidence;
        if (evidence && /^data:(?:image\/(?:jpeg|png)|video\/(?:mp4|webm));base64,/.test(evidence)) {
          const media = element(evidence.startsWith('data:video/') ? 'video' : 'img', '', actions);
          media.className = 'dispute-evidence';
          if (media.tagName === 'VIDEO') media.controls = true;
          else media.alt = 'Bằng chứng do khách cung cấp';
          media.src = evidence;
        }
        const photos = element('section', null, actions);
        const results = element('div', null, photos);
        button(photos, 'Xem ảnh trước / sau', () => showJobPhotos(row.id, results));
      }
    }
  }
  function clearPhotos() {
    for (const url of photoUrls) URL.revokeObjectURL(url);
    photoUrls.clear();
  }
  async function comparePhotoPair(before, after) {
    const thumbnails = [];
    try {
      for (const blob of [before, after]) thumbnails.push(await createImageBitmap(blob));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d');
      const pixels = thumbnails.map(image => {
        ctx.drawImage(image, 0, 0, 96, 96);
        return ctx.getImageData(0, 0, 96, 96).data;
      });
      let difference = 0;
      for (let i = 0; i < pixels[0].length; i += 4) {
        for (let channel = 0; channel < 3; channel++) difference += Math.abs(pixels[0][i + channel] - pixels[1][i + channel]);
      }
      return Math.round(difference * 100 / (96 * 96 * 3 * 255));
    } finally {
      for (const thumbnail of thumbnails) thumbnail.close();
    }
  }
  async function showJobPhotos(id, target) {
    clearPhotos();
    target.textContent = 'Đang tải ảnh công việc…';
    try {
      const { data } = await api.staff.getTaskChecklist(id);
      if (!target.isConnected) return;
      target.replaceChildren();
      const pairs = data.checklist.filter(pair => pair.beforeImage || pair.afterImage);
      if (!pairs.length) target.textContent = 'Đơn này chưa có ảnh trước / sau.';
      for (const pair of pairs) {
        const group = element('div', null, target);
        const images = [];
        element('h3', `${pair.areaName} · ${pair.angleId}`, group);
        for (const [label, photo] of [['Trước', pair.beforeImage], ['Sau', pair.afterImage]]) {
          const figure = element('figure', null, group);
          element('figcaption', label, figure);
          if (!photo || !/^\/staff\/photos\/[a-f0-9]{48}\.(jpe?g|png|webp)$/i.test(photo.url)) {
            element('p', 'Chưa có ảnh', figure);
            continue;
          }
          const blob = await api.staff.getTaskPhoto(photo.url);
          if (!target.isConnected) return;
          images.push(blob);
          const url = URL.createObjectURL(blob);
          photoUrls.add(url);
          const image = element('img', null, figure);
          image.alt = `${label} khi dọn · ${pair.areaName}`;
          image.src = url;
        }
        if (images.length === 2 && typeof createImageBitmap === 'function') {
          try {
            const difference = await comparePhotoPair(...images);
            if (group.isConnected) element('p', `Sai khác màu trung bình: ${difference}%. Chỉ số này không đo độ sạch.`, group);
          } catch {
            if (group.isConnected) element('p', 'Không tính được độ sai khác cho cặp ảnh này.', group);
          }
        }
      }
    } catch (err) {
      if (target.isConnected) target.textContent = err.message;
    }
  }
  function renderLive(row) {
    byId('order-summary').textContent = row ? [
      stage[row.status] || row.status, money(row.total),
      row.prebook ? ({
        waiting: 'Đang chờ nhân viên phản hồi trong 30 phút',
        approved: 'Nhân Viên Đã Xác Nhận Lịch Hẹn · đang chờ xong ca hiện tại',
        confirmed: 'Nhân Viên Đã Xác Nhận Lịch Hẹn',
        declined: `Lịch đặt trước chưa được nhận · ${row.prebook.reason}`
      })[row.prebook.status] : '',
      row.payment ? `Đã thanh toán demo ${money(row.payment.amount)}, hoàn ${money(row.payment.refunded)}` : '',
      row.disputed ? 'Đang tạm giữ phần thù lao chưa giải ngân' : '',
      row.dispute?.decision === 'insurance' ? `Bảo hiểm giả lập ${money(row.dispute.insuranceContribution)} · Khấu trừ ${money(row.dispute.staffDebit)}` : '',
      row.dispute?.decision === 'staff_fault' ? `Đã bồi thường vào ví demo ${money(row.dispute.amount)}` : '',
      row.dispute?.decision === 'manual_review' ? 'Đang chờ xem xét thủ công' : '',
      row.dispute ? `Khiếu nại ${row.dispute.status === 'open' ? 'đang mở' : 'đã xử lý'} — ${row.dispute.reason}${row.dispute.note ? ' · ' + row.dispute.note : ''}` : ''
    ].filter(Boolean).join(' · ') : 'Chưa có đơn phù hợp.';
    const position = row?.location;
    const locationText = byId('live-position');
    locationText.replaceChildren();
    if (position) {
      const link = element('a', 'Xem vị trí trên bản đồ', locationText);
      link.href = `https://www.openstreetmap.org/?mlat=${position.latitude}&mlon=${position.longitude}#map=16/${position.latitude}/${position.longitude}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      locationText.append(` · ETA demo khoảng ${position.etaMinutes} phút${position.sampleDestination ? ' (điểm đến mẫu)' : ''}`);
    }
    const messages = byId('messages');
    const chat = row?.messages || [];
    if (messages.dataset.key !== JSON.stringify(chat)) {
      messages.dataset.key = JSON.stringify(chat);
      messages.replaceChildren();
      for (const message of chat) {
        const line = element('li', `${message.role === 'customer' ? 'Khách' : 'Nhân viên'} — ${message.text || 'Ảnh'}`, messages);
        if (message.photo && message.photo.startsWith('data:image/jpeg;base64,')) {
          const image = element('img', null, line);
          image.alt = 'Ảnh đính kèm';
          image.src = message.photo;
        }
      }
    }
  }
  function selectOrder(force = false) {
    const row = state.bookings.find(item => item.id === Number(order.value));
    const key = row && JSON.stringify([row.id, row.status, row.paymentStatus, row.dispute, row.dispatch, row.signature?.at, row.prebook]);
    if (force || key !== activeOrder) {
      if (key !== activeOrder) stopTracking();
      renderActions(row);
      activeOrder = key;
    }
    renderLive(row);
  }
  async function refresh(force = false) {
    if (loading) {
      refreshPending = true;
      return;
    }
    loading = true;
    try {
      const first = !state;
      state = await request();
      const selected = nextOrder ?? (first ? new URLSearchParams(location.search).get('order') : order.value);
      nextOrder = null;
      const options = state.bookings.map(row => [row.id, row.code]);
      const key = JSON.stringify(options);
      if (order.dataset.key !== key) {
        order.dataset.key = key;
        order.replaceChildren();
        for (const [id, code] of options) element('option', code, order).value = id;
      }
      if (options.some(([id]) => String(id) === selected)) order.value = selected;
      byId('booking').hidden = false;
      selectOrder(force);
      if (first && location.hash === '#nghiem-thu') byId('nghiem-thu')?.scrollIntoView({ block: 'nearest' });
      byId('back').href = { customer: '/my-bookings.html', staff: '/staff.html', admin: '/admin.html' }[state.role];
      if (state.role === 'staff') {
        const trust = byId('staff-trust');
        trust.hidden = false;
        trust.textContent = `Điểm tín nhiệm: ${state.staffTrust.score}/100${state.staffTrust.suspended ? ' · Tạm dừng nhận ca để kiểm định' : ''}`;
        const panel = byId('offers');
        const key = JSON.stringify(state.offers);
        panel.hidden = !state.offers.length;
        if (panel.dataset.key !== key) {
          panel.dataset.key = key;
          panel.replaceChildren();
          element('h2', 'Ca được mời theo khoảng cách', panel);
          for (const offer of state.offers) {
            if (offer.prebook) {
              const reservation = element('div', '', panel);
              element('p', `${offer.code} · Lịch đặt trước${offer.prebook === 'approved' ? ' · Chờ xong ca hiện tại' : ''}`, reservation);
              const decide = (decision, reason) => perform(() => request(`/prebook/${offer.id}/decision`, { decision, reason }));
              if (offer.prebook === 'waiting') button(reservation, 'Xác nhận lịch hẹn', () => decide('approve'));
              button(reservation, 'Từ chối lịch hẹn', () => {
                if (!reservation.querySelector('form')) form(reservation, [['Lý do từ chối', 'text']], 'Gửi lý do',
                  reason => decide('decline', reason));
              });
              continue;
            }
            const row = element('p', `${offer.code} · ${offer.km.toFixed(1)} km${offer.isPriority ? ' · được ưu tiên' : ''} `, panel);
            if (offer.canAccept) button(row, 'Nhận ca', () => perform(() => api.staff.acceptBooking(offer.id)));
            else row.append('· Chờ hết thời gian ưu tiên');
          }
          if (first && location.hash === '#offers') panel.scrollIntoView({ block: 'nearest' });
        }
      }
      if (state.role === 'customer') {
        const membership = byId('membership');
        const summary = `${state.points} điểm · Hạng ${state.tier}${state.discountRate ? ` · Giảm ${state.discountRate * 100}%` : ''}`;
        if (first || force || membership.dataset.summary !== summary) {
          membership.dataset.summary = summary;
          membership.hidden = false;
          membership.replaceChildren();
          element('h2', summary, membership);
          const select = element('select', null, element('label', 'Nhân viên ưu tiên cho lịch định kỳ', membership));
          element('option', 'Chưa chọn', select).value = '';
          for (const worker of state.staffOptions) element('option', worker.name, select).value = worker.id;
          select.value = state.favoriteStaff || '';
          button(membership, 'Lưu lựa chọn', () => perform(() => request('/favorite', { staffId: select.value ? Number(select.value) : null })));
        }
      }
      if (state.identity) {
        if (byId('finance').hidden) renderFinance();
        const panel = byId('identity');
        const profile = state.identity;
        const identityKey = JSON.stringify([profile.status, profile.extracted, profile.signedAt]);
        if (panel.dataset.status === identityKey) return;
        panel.dataset.status = identityKey;
        panel.hidden = false;
        panel.replaceChildren();
        element('h2', 'Xác minh đối tác mẫu', panel);
        element('p', `${profile.name} · ${profile.document} · ${{ pending: 'Chờ xử lý', verified: 'Đã xác minh', rejected: 'Đã từ chối' }[profile.status]}`, panel);
        if (profile.extracted) element('p', `Kết quả OCR mẫu · ${profile.extracted.name} · ${profile.extracted.document}`, panel);
        if (profile.signedAt) element('p', 'Đã ký hợp đồng đối tác mẫu.', panel);
        if (profile.status === 'pending') {
          if (!profile.extracted) button(panel, 'Mô phỏng OCR hồ sơ mẫu', () => perform(() => request('/identity', { decision: 'scan' })));
          else if (!profile.signedAt) button(panel, 'Ký hợp đồng mẫu', () => perform(() => request('/identity', { decision: 'sign' })));
          else button(panel, 'Xác minh hồ sơ mẫu', () => perform(() => request('/identity', { decision: 'verified' })));
          button(panel, 'Từ chối hồ sơ mẫu', () => perform(() => request('/identity', { decision: 'rejected' })));
        }
      }
    } finally {
      loading = false;
      if (refreshPending) {
        refreshPending = false;
        queueMicrotask(sync);
      }
    }
  }
  order.addEventListener('change', () => selectOrder(true));
  window.addEventListener('pagehide', () => {
    stopTracking();
    clearPhotos();
  });
  function sync() {
    return refresh().catch(err => {
      stopTracking();
      notice.textContent = err.message;
    });
  }
  refresh().then(() => {
    if (window.io) {
      const socket = window.io({ auth: { token: api.auth.getToken() } });
      socket.on('demo_features_changed', sync);
      socket.on('connect', sync);
      window.addEventListener('pagehide', () => socket.disconnect(), { once: true });
      setInterval(() => { if (!socket.connected) sync(); }, 3000);
      // Reconcile expired positions and priority windows even without server events.
      setInterval(() => { if (socket.connected) sync(); }, 15000);
    } else {
      setInterval(sync, 3000);
    }
  }).catch(err => { notice.textContent = err.message; });
})();
