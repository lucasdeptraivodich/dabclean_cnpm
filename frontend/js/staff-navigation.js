/* Navigation is loaded on demand, after server verifies order acceptance/ownership. */
(() => {
  'use strict';
  const dialog = document.createElement('dialog');
  dialog.className = 'staff-navigation';
  dialog.setAttribute('aria-label', 'Bản đồ đến nhà khách hàng');
  document.body.append(dialog);
  let generation = 0;

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function close() {
    generation++;
    dialog.close();
    dialog.replaceChildren(); // Stop map requests and discard staff location.
  }
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-task-navigation]');
    if (!button || button.disabled) return;
    const id = button.dataset.taskNavigation;
    if (!/^\d+$/.test(id)) return;
    button.disabled = true;
    const current = ++generation;
    const content = element('section');
    const closeButton = element('button', 'Đóng');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-secondary btn-sm';
    closeButton.addEventListener('click', close);
    const heading = element('h2', 'Bản đồ đến nhà khách hàng');
    const status = element('p', 'Đang kiểm tra công việc…');
    status.setAttribute('role', 'status');
    content.append(closeButton, heading, status);
    dialog.replaceChildren(content);
    if (!dialog.open) dialog.showModal();
    try {
      const result = await DabCleanAPI.staff.getTaskNavigation(id);
      if (current !== generation) return;
      if (!result.success || !result.data || typeof result.data.address !== 'string') {
        throw new Error(result.message || 'Không lấy được địa chỉ công việc.');
      }
      const address = result.data.address.trim();
      if (!address) throw new Error('Đơn chưa có địa chỉ. Vui lòng liên hệ khách hàng.');
      status.textContent = 'Điểm đến: ' + address;
      const hint = element('p', 'Bản đồ tìm theo địa chỉ khách đã nhập. Hãy đối chiếu số nhà/căn hộ và liên hệ khách nếu địa chỉ chưa rõ.');
      const map = element('iframe');
      const mapUrl = new URL('https://maps.google.com/maps');
      mapUrl.searchParams.set('q', address);
      mapUrl.searchParams.set('output', 'embed');
      map.src = mapUrl.href;
      map.title = 'Bản đồ địa chỉ thực hiện dịch vụ';
      map.referrerPolicy = 'no-referrer';
      map.loading = 'lazy';
      const directions = element('a', 'Mở Google Maps chỉ đường');
      directions.className = 'btn btn-primary';
      directions.target = '_blank';
      directions.rel = 'noopener noreferrer';
      const route = new URL('https://www.google.com/maps/dir/');
      route.searchParams.set('api', '1');
      route.searchParams.set('destination', address);
      route.searchParams.set('dir_action', 'navigate');
      directions.setAttribute('href', route.href);
      const locate = element('button', '📍 Dùng GPS của tôi làm điểm xuất phát');
      locate.type = 'button';
      locate.className = 'btn btn-secondary';
      const gpsStatus = element('p', 'Bạn có thể mở Google Maps để chọn điểm xuất phát nếu không bật GPS.');
      gpsStatus.setAttribute('role', 'status');
      locate.addEventListener('click', () => {
        if (!navigator.geolocation) {
          gpsStatus.textContent = 'Trình duyệt không hỗ trợ GPS. Hãy chọn điểm xuất phát trong Google Maps.';
          return;
        }
        locate.disabled = true;
        gpsStatus.textContent = 'Đang xác định vị trí của bạn…';
        navigator.geolocation.getCurrentPosition(position => {
          if (current !== generation) return;
          locate.disabled = false;
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
            gpsStatus.textContent = 'GPS trả về tọa độ không hợp lệ. Hãy chọn điểm xuất phát trong Google Maps.';
            return;
          }
          route.searchParams.set('origin', `${latitude},${longitude}`);
          directions.setAttribute('href', route.href);
          gpsStatus.textContent = `Đã lấy vị trí nhân viên${Number.isFinite(accuracy) ? ` (sai số khoảng ${Math.round(accuracy)} m)` : ''}. Bấm mở Google Maps để đi đến địa chỉ khách.`;
        }, () => {
          if (current !== generation) return;
          locate.disabled = false;
          route.searchParams.delete('origin');
          directions.setAttribute('href', route.href);
          gpsStatus.textContent = 'Không lấy được GPS. Kiểm tra quyền vị trí/HTTPS hoặc chọn điểm xuất phát trong Google Maps.';
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
      content.append(hint, map, locate, directions, gpsStatus);
    } catch (err) {
      if (current === generation) status.textContent = err.message || 'Không tải được bản đồ. Vui lòng thử lại.';
    } finally { button.disabled = false; }
  });
})();
