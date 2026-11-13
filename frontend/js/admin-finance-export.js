(() => {
  const excel = document.getElementById('export-finance-excel');
  const pdf = document.getElementById('export-finance-pdf');
  let report;

  const metrics = [
    ['Tiền khách đã trả', 'gross_payments'],
    ['Tiền hoàn cho khách', 'refund_amount'],
    ['Tiền thu ròng', 'net_receipts'],
    ['Tiền công gộp', 'staff_gross_wages'],
    ['Chiết khấu nền tảng', 'platform_commission'],
    ['Tiền công ròng', 'staff_net_wages']
  ];
  const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  })[char]);
  const cell = value => {
    const type = typeof value === 'number' ? 'Number' : 'String';
    return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
  };

  window.addEventListener('admin-finance-stats', ({ detail }) => {
    report = detail && {
      period: detail.period,
      rows: metrics.map(([label, key]) => [label, amount(detail.stats[key])])
    };
    excel.disabled = pdf.disabled = !report;
  });

  excel.addEventListener('click', () => {
    if (!report) return;
    const rows = [['Báo cáo tài chính DabClean'], [report.period], ['Chỉ tiêu', 'Số tiền (VND)'], ...report.rows];
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n'
      + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
      + '<Worksheet ss:Name="Tài chính"><Table><Column ss:Width="220"/><Column ss:Width="130"/>'
      + rows.map(row => `<Row>${row.map(cell).join('')}</Row>`).join('')
      + '</Table></Worksheet></Workbook>';
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dabclean-bao-cao-tai-chinh.xml';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  pdf.addEventListener('click', () => {
    if (!report) return;
    const preview = window.open('', '_blank');
    if (!preview) {
      window.alert('Hãy cho phép mở cửa sổ in để lưu báo cáo PDF.');
      return;
    }
    preview.opener = null;
    const doc = preview.document;
    doc.title = 'Báo cáo tài chính DabClean';
    const heading = doc.createElement('h1');
    heading.textContent = doc.title;
    const period = doc.createElement('p');
    period.textContent = report.period;
    const table = doc.createElement('table');
    const header = table.createTHead().insertRow();
    for (const label of ['Chỉ tiêu', 'Số tiền (VND)']) {
      const column = doc.createElement('th');
      column.scope = 'col';
      column.textContent = label;
      header.append(column);
    }
    const body = table.createTBody();
    const format = new Intl.NumberFormat('vi-VN');
    for (const [label, value] of report.rows) {
      const row = body.insertRow();
      row.insertCell().textContent = label;
      row.insertCell().textContent = format.format(value);
    }
    const style = doc.createElement('style');
    style.textContent = 'body{font:16px system-ui;margin:2rem}table{border-collapse:collapse;width:100%}th,td{padding:.65rem;border-bottom:1px solid #aaa;text-align:left}th:last-child,td:last-child{text-align:right}';
    doc.head.append(style);
    doc.body.append(heading, period, table);
    preview.print();
  });
})();
