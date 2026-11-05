'use strict';
let providerReady=false, capabilityRequest=0;
async function loadCapabilities(){
  const sequence=++capabilityRequest;
  providerReady=false;document.getElementById('submit').disabled=true;
  const version=document.getElementById('version').value;
  try{
    const response=await fetch(`/api/ai/v${version}/capabilities`,{signal:AbortSignal.timeout(8000)});
    const json=await response.json();if(!response.ok||!json.success||!json.data.enabled)throw Error('Dịch vụ AI chưa sẵn sàng.');
    if(sequence!==capabilityRequest)return;
    const gateway=json.data.provider==='9router';
    document.getElementById('privacy-notice').textContent=gateway
      ?'Ảnh được gửi qua 9Router đến nhà cung cấp model. DabClean không lưu ảnh vào thư viện; chính sách lưu dữ liệu phía nhà cung cấp áp dụng riêng. Điểm là ước tính chưa kiểm chứng.'
      :'Ảnh được xử lý local và giữ trong RAM, không gửi đến API AI bên ngoài. Điểm là ước tính chưa kiểm chứng.';
    document.getElementById('submit').textContent=gateway?'Phân tích qua 9Router':'Phân tích ảnh local';
    providerReady=true;document.getElementById('submit').disabled=false;
  }catch(err){if(sequence===capabilityRequest)document.getElementById('status').textContent='Không kiểm tra được dịch vụ AI; vui lòng tải lại trang.';}
}
document.getElementById('version').addEventListener('change',loadCapabilities);
loadCapabilities();
document.getElementById('scan').addEventListener('submit', async event => {
  event.preventDefault();
  if(!providerReady)return;
  const files = Array.from(document.getElementById('images').files);
  const status = document.getElementById('status'), button = document.getElementById('submit');
  const result = document.getElementById('result');
  if (files.length > 4 || files.some(file => file.size > 6 * 1024 * 1024)) {
    status.textContent = 'Chỉ nhận tối đa 4 ảnh, mỗi ảnh 6 MB.'; return;
  }
  button.disabled = true; DabCleanAiV3.clear(result);
  status.textContent = 'Đang phân tích ảnh. Mỗi ảnh có thể cần một lúc; không có phần trăm tiến trình giả.';
  document.getElementById('version').disabled=true;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 810000);
  try {
    const body = new FormData(); files.forEach(file => body.append('images', file));
    const version = ['3.1','3.2'].includes(document.getElementById('version').value) ? document.getElementById('version').value : '3';
    const response = await fetch(`/api/ai/v${version}/analyze`, { method: 'POST', body, signal: controller.signal });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || 'Phân tích thất bại.');
    DabCleanAiV3.render(result, json.data, files); status.textContent = 'Đã xử lý từng ảnh. Kiểm tra nhận định và giới hạn dưới đây.';
  } catch (err) { status.textContent = err.name === 'AbortError' ? 'Quá thời gian chờ; thử ít ảnh hơn.' : err.message; }
  finally { clearTimeout(timeout); button.disabled = !providerReady; document.getElementById('version').disabled=false; }
});
