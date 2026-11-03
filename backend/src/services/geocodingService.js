// Normalize syntax only: never invent a street name or house coordinate.
const fold = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
function addressPlan(address) {
 const normalized = address.trim().replace(/\s+/g, ' ').replace(/\bHN\b/gi, 'Hà Nội')
  .replace(/(?:,\s*)?(?:ha noi|hà nội)\s*$/iu, ', Hà Nội').replace(/,\s*,/g, ',').replace(/\s+,/g, ',');
 const noHouse = normalized.replace(/^(?:số\s*|so\s*)?\d+[a-z]?(?:[\/.-]\d+[a-z]?)*\s*[, ]\s*/iu, '');
 const street = noHouse.replace(/^(?:(?:ngõ|ngo|ngách|ngach|hẻm|hem)\s*\d+(?:[\/.-]\d+)*\s*[, ]\s*)+/iu, '');
 return [...new Set([normalized, noHouse, street])].filter(q => q.length >= 3);
}
// One process-wide provider gate. Multi-instance deployments must share a limiter/cache.
function createGeocoder({ fetchImpl = globalThis.fetch, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
 const cache = new Map();
 let lastRequest = -Infinity, busy = false;
 const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
 return { async search(address) {
  if (typeof address !== 'string' || address.trim().length < 3 || address.length > 255 || /[\x00-\x1f]/.test(address)) {
   throw fail(400, 'Vui lòng nhập địa chỉ từ 3 đến 255 ký tự.');
  }
  const plans = addressPlan(address);
  const query = plans[0];
  const inHanoi = /\bha noi\b/.test(fold(query));
  const key = query.toLocaleLowerCase('vi');
  const cached = cache.get(key);
  if (cached && cached.expires > now()) return cached.results;
  if (busy || now() - lastRequest < 1100) throw fail(429, 'Hệ thống bản đồ đang bận. Vui lòng thử lại sau vài giây.');
  busy = true;
  try {
   let results = [];
   for (let attempt = 0; attempt < plans.length; attempt++) {
   if (attempt) await sleep(Math.max(0, 1100 - (now() - lastRequest)));
   lastRequest = now();
   const url = new URL(process.env.GEOCODING_SEARCH_URL || 'https://nominatim.openstreetmap.org/search');
   if (url.protocol !== 'https:') throw Error('HTTPS required');
   url.search = new URLSearchParams({ q: plans[attempt], addressdetails: '1', format: 'jsonv2', limit: '3', countrycodes: 'vn',
    viewbox: '105.3,21.5,106.1,20.5', 'accept-language': 'vi' }).toString();
   const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000), headers: {
    'User-Agent': process.env.GEOCODING_USER_AGENT || 'DabClean/1.0 (booking address lookup)', Accept: 'application/json'
   } });
   if (!response.ok) throw Error('Provider unavailable');
   const body = await response.json();
   if (!Array.isArray(body)) throw Error('Invalid provider response');
   results = body.slice(0, 3).filter(item => !inHanoi || /\bha noi\b/.test(fold(String(item.display_name || ''))))
    .map(item => {
     const house = String(item.address?.house_number || '');
     const requestedHouse = address.match(/^(?:số\s*|so\s*)?(\d+[a-z]?(?:[\/.-]\d+[a-z]?)*)/iu)?.[1];
     const exactHouse = attempt === 0 && requestedHouse && fold(house) === fold(requestedHouse);
     const isStreet = ['road', 'residential', 'pedestrian', 'service', 'living_street', 'footway'].includes(item.type) || item.class === 'highway';
     return { latitude: Number(item.lat), longitude: Number(item.lon),
      label: String(item.display_name || '').slice(0, 500),
      match_level: exactHouse ? 'house' : isStreet ? 'street' : 'area',
      approximate: !exactHouse, matched_query: plans[attempt] };
    }).filter(item => Number.isFinite(item.latitude) && Math.abs(item.latitude) <= 90 &&
     Number.isFinite(item.longitude) && Math.abs(item.longitude) <= 180);
   if (results.length) break;
   }
   if (cache.size >= 500) cache.delete(cache.keys().next().value);
   cache.set(key, { results, expires: now() + 86400000 });
   return results;
  } catch (_) { throw fail(503, 'Chưa tìm được vị trí lúc này. Bạn có thể chọn ghim thủ công hoặc thử lại.'); }
  finally { busy = false; }
 } };
}
module.exports = { createGeocoder, addressPlan };
