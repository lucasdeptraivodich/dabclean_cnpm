/* Booking location: completed address lookup, manual pin and explicit confirmation. */
(() => {
 'use strict';
 const address = document.getElementById('booking-address') || document.getElementById('care-address');
 let candidate = null, confirmed = false, pending = false, version = 0, lastQuery = '';
 window.BookingLocation = { getValue: () => confirmed && candidate ? { ...candidate } : {} };
 if (!address) return;
 const box = document.createElement('section'); box.className = 'booking-location';
 box.setAttribute('aria-label', 'Vị trí thực hiện dịch vụ');
 const make = (tag, text, parent = box) => {
  const element = document.createElement(tag); if (text) element.textContent = text;
  parent.append(element); return element;
 };
 make('strong', '📍 Chọn đúng vị trí nhà bạn');
 make('p', 'Nhập xong địa chỉ để tự tìm vị trí. Nếu ghim chưa đúng, hãy kéo ghim đến đúng nhà rồi xác nhận.');
 make('small', 'Địa chỉ được tra cứu qua OpenStreetMap/Nominatim. Không nhập tên, số điện thoại hoặc thông tin riêng tư vào ô địa chỉ.');
 const actions = make('div'); actions.className = 'location-actions';
 const button = text => { const element = make('button', text, actions); element.type = 'button'; return element; };
 const search = button('Tìm trên bản đồ'), locate = button('Lấy vị trí hiện tại'), clear = button('Xóa vị trí');
 const status = make('p', 'Bạn cũng có thể chọn ghim thủ công hoặc đặt lịch bằng địa chỉ.');
 status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
 const results = make('div'); results.className = 'location-results';
 const mapNode = make('div'); mapNode.className = 'location-map';
 mapNode.setAttribute('aria-label', 'Bản đồ vị trí, nhấn hoặc kéo ghim để điều chỉnh');
 const details = make('small');
 const confirm = make('button', 'Xác nhận vị trí này'); confirm.type = 'button'; confirm.disabled = true;
 const link = make('a', 'Mở vị trí đã chọn'); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.hidden = true;
 address.insertAdjacentElement('afterend', box);
 let map, marker, circle;
 const removeLayers = () => { if (marker) { marker.remove(); marker = null; } if (circle) { circle.remove(); circle = null; } };
 function reset() {
  version++; pending = false; candidate = null; confirmed = false; lastQuery = '';
  results.replaceChildren(); removeLayers(); confirm.disabled = true; link.hidden = true; details.textContent = '';
  status.textContent = 'Địa chỉ đã thay đổi. Hãy tìm và xác nhận lại vị trí.';
 }
 function draw() {
  if (!map || !candidate) return;
  removeLayers();
  const point = [candidate.latitude, candidate.longitude];
  marker = L.marker(point, { draggable: true }).addTo(map);
  marker.on('dragend', () => { const pos = marker.getLatLng(); select(pos.lat, pos.lng, null); });
  if (candidate.location_accuracy != null) circle = L.circle(point, { radius: candidate.location_accuracy,
   color: '#059669', fillOpacity: 0.08, weight: 1 }).addTo(map);
  map.setView(point, 17);
 }
 function select(latitude, longitude, accuracy) {
  version++; pending = false; confirmed = false; lastQuery = address.value.trim();
  candidate = { latitude, longitude, location_accuracy: accuracy ?? null };
  confirm.disabled = false;
  status.textContent = 'Vị trí có thể chưa chính xác. Vui lòng kéo ghim đến đúng nhà trước khi xác nhận.';
  details.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` +
   (accuracy != null ? ` · Sai số thiết bị khoảng ${Math.round(accuracy)} m` : ' · Vị trí từ địa chỉ hoặc ghim thủ công');
  link.href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
  link.hidden = false; draw();
 }
 address.addEventListener('input', reset);
 clear.addEventListener('click', reset);
 confirm.addEventListener('click', () => {
  if (!candidate || pending) return;
  confirmed = true; confirm.disabled = true; status.textContent = '✓ Đã xác nhận vị trí. Tọa độ này sẽ được lưu cùng đơn đặt lịch.';
 });
 const saved = document.getElementById('select-saved-address');
 if (saved) saved.addEventListener('change', () => { reset(); lookup(); });
 async function lookup() {
  const query = address.value.trim();
  if (query.length < 3 || query === lastQuery) return;
  reset(); lastQuery = query; pending = true;
  const current = ++version;
  status.textContent = 'Đang rà soát địa chỉ, số nhà/ngõ và khu vực phù hợp…';
  try {
   const base = window.DabCleanAPI?.BASE_URL || '/api';
   const token = localStorage.getItem('dabclean_token') || sessionStorage.getItem('dabclean_token') ||
    localStorage.getItem('cleanova_token') || sessionStorage.getItem('cleanova_token');
   const response = await fetch(`${base}/maps/search`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ address: query }), signal: AbortSignal.timeout(22000) });
   const data = await response.json();
   if (current !== version) return;
   pending = false;
   if (!response.ok) throw Error(data.message || 'Không tìm được vị trí.');
   if (!Array.isArray(data.data) || !data.data.length) {
    lastQuery = ''; status.textContent = 'Chưa tìm thấy địa chỉ. Bổ sung phường/quận/thành phố hoặc chọn ghim thủ công.'; return;
   }
   const choose = item => {
    select(item.latitude, item.longitude, null);
    if (item.approximate) {
     status.textContent = item.match_level === 'street'
      ? 'Chỉ tìm thấy đường, chưa xác định được số nhà/ngõ. Hãy kéo ghim tới đúng nhà rồi xác nhận.'
      : 'Chỉ tìm thấy khu vực gần địa chỉ, chưa xác định được số nhà/ngõ. Hãy phóng to và kéo ghim tới đúng nhà rồi xác nhận.';
     if (map) map.setView([item.latitude, item.longitude], item.match_level === 'street' ? 15 : 13);
    }
   };
   choose(data.data[0]);
   for (const item of data.data) {
    const choice = make('button', item.label + (item.approximate ? ' · Vị trí gần đúng' : ''), results); choice.type = 'button';
    choice.addEventListener('click', () => { choose(item); });
   }
  } catch (error) {
   if (current !== version) return;
   pending = false; lastQuery = '';
   status.textContent = error.message || 'Không kết nối được dịch vụ địa chỉ. Hãy chọn ghim thủ công.';
  }
 }
 address.addEventListener('blur', lookup);
 search.addEventListener('click', lookup);
 locate.addEventListener('click', () => {
  if (!window.isSecureContext || !navigator.geolocation) {
   status.textContent = 'GPS cần HTTPS hoặc localhost. Bạn vẫn có thể tìm theo địa chỉ hoặc chọn trên bản đồ.'; return;
  }
  const current = ++version; pending = true; confirmed = false; confirm.disabled = true;
  locate.disabled = true; status.textContent = 'Đang lấy vị trí. Vui lòng cho phép truy cập vị trí trên thiết bị…';
  navigator.geolocation.getCurrentPosition(position => {
   locate.disabled = false; if (current !== version) return;
   select(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  }, error => {
   locate.disabled = false; if (current !== version) return;
   pending = false; candidate = null; confirmed = false; confirm.disabled = true; removeLayers(); link.hidden = true;
   status.textContent = error.code === 1 ? 'Bạn chưa cho phép truy cập vị trí. Hãy tìm theo địa chỉ hoặc chọn ghim.' : 'Không lấy được GPS. Hãy thử lại hoặc chọn ghim.';
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
 });
 const form = address.closest('form');
 if (form) form.addEventListener('submit', event => {
  if (pending || (candidate && !confirmed)) {
   event.preventDefault(); event.stopImmediatePropagation();
   status.textContent = pending ? 'Vui lòng chờ tìm vị trí hoặc xóa vị trí để tiếp tục.' : 'Vui lòng kiểm tra ghim và bấm “Xác nhận vị trí này”.';
   confirm.focus();
  }
 }, true);
 function loadLeaflet() {
  if (window.L) return Promise.resolve();
  return new Promise((resolve, reject) => {
   const css = document.createElement('link'); css.rel = 'stylesheet';
   css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
   css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = '';
   document.head.append(css);
   const script = document.createElement('script');
   script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
   script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; script.crossOrigin = '';
   const timer = setTimeout(() => reject(Error('map timeout')), 12000);
   script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); reject(Error('map unavailable')); };
   document.head.append(script);
  });
 }
 async function initMap() {
  try {
   await loadLeaflet();
   const base = window.DabCleanAPI?.BASE_URL || '/api';
   let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
   try { const response = await fetch(`${base}/maps/config`); if (response.ok) tileUrl = (await response.json()).tileUrl || tileUrl; } catch (_) {}
   map = L.map(mapNode, { scrollWheelZoom: false }).setView([21.0285, 105.8542], 12);
   L.tileLayer(tileUrl, { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
   map.on('click', event => select(event.latlng.lat, event.latlng.lng, null));
   draw();
  } catch (_) { mapNode.textContent = 'Không tải được bản đồ. Bạn vẫn có thể tìm địa chỉ hoặc lấy GPS, rồi mở liên kết vị trí để kiểm tra.'; }
 }
 initMap();
})();
