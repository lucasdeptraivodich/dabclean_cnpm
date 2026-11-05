(function(root){
'use strict';
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
const urls=new WeakMap();
function clear(container){(urls.get(container)||[]).forEach(url=>URL.revokeObjectURL(url));urls.delete(container);container.replaceChildren();}
  function renderV32(container, result, files, options = {}) {
    const compact=options.compact===true;
    clear(container);
    const previews=[]; urls.set(container, previews);
    if(!compact)container.append(element('h3', '', 'DabClean AI V3.2 · Ba tiêu chí'));
    if(!compact)container.append(element('p', 'v3-notice', 'Ước tính thử nghiệm, chưa kiểm chứng độ chính xác. ' + result.scoreMeaning));
    if(!compact && result.privacy?.inference==='9router_upstream') container.append(element('p','v3-notice',result.privacy.notice));
    for (const image of result.images || []) {
      const card=element('article','v3-image-card');
      if(!compact || result.images.length>1)card.append(element('h4','',compact?`Ảnh ${image.id}`:`Ảnh ${image.id} · ${image.filename}`));
      if(!compact && files?.[image.id-1]) {
        const preview=element('img','v3-preview'); const url=URL.createObjectURL(files[image.id-1]); previews.push(url);
        preview.src=url; preview.alt=`Ảnh ${image.id}`; card.append(preview);
      }
      if(image.mobileNet) card.append(element('p','','MobileNet tổng quan: '+image.mobileNet.label+' (tham khảo riêng).'));
      if(!compact && image.model?.provider==='9router') card.append(element('p','','Model qua 9Router: '+image.model.requested));
      for(const item of image.metrics || []) {
        const row=element('section','v3-metric v32-metric');
        const heading=element('div','v32-heading');heading.append(element('h5','',item.label));row.append(heading);
        const known=item.status==='estimated' && Number.isInteger(item.score) && item.score>=0 && item.score<=100;
        heading.append(element('strong',known?'v31-value':'v3-unknown',known?`${item.score}%`:'Chưa đủ dữ liệu'));
        if(known) {
          const track=element('div','v31-track v32-track'); track.setAttribute('role','progressbar');
          track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(item.score));track.setAttribute('aria-label',item.label);
          const fill=element('div','v31-fill v32-fill');fill.style.width=item.score+'%';track.append(fill);row.append(track);
          const scale=element('div','v32-scale');scale.append(element('span','','0%'),element('span','','100%'));row.append(scale);
        }
        if(item.evidence) row.append(element('p','',`Dấu hiệu: ${item.evidence}. Vị trí: ${item.location || 'chưa rõ'}`));
        if(known && item.coverage==='partial')row.append(element('small','v3-visibility','Phần nhìn thấy · Đã đánh giá: '+(item.assessedComponents||[]).map(c=>c.label).join(', ')+'.'));
        if(item.unassessedComponents?.length) row.append(element('small','v3-visibility','Chưa đánh giá: '+item.unassessedComponents.map(c=>c.label).join(', ')+'.'));
        if(!known && item.limitation)row.append(element('p','v3-visibility',item.limitation));
        card.append(row);
      }
      container.append(card);
    }
    const overall=result.overall;
    const labels={sach:'Sạch','hoi-ban':'Hơi bẩn','rat-ban':'Rất bẩn'};
    const overallPanel=element('section','v32-overall');
    const overallLabel=overall&&Object.hasOwn(labels,overall.level)?labels[overall.level]:'Chưa đủ dữ liệu';
    overallPanel.append(element('h4','',`Tổng quan: ${overallLabel}`));
    if(overall?.reason)overallPanel.append(element('p','',overall.reason));
    container.append(overallPanel);
    if(!compact)container.append(element('p','v3-notice','Không suy đoán góc bị che. Chụp thêm ảnh cận cảnh nếu chưa đủ dữ liệu. Kết quả không tự động thay đổi giá dịch vụ.'));
  }
  root.DabCleanAiV3={render:renderV32,clear};
})(window);
