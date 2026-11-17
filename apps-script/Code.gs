const METRO_SOURCE = {
  id: '1KHznuI_Vi4749R8f47EI5a2QtYFIRLoHiuPsNc7wrHU',
  gid: 661497906,
  headerRow: 3,
};

function doGet(event) {
  const p = event && event.parameter || {};
  const page = ['overview', 'btgpmb', 'finance', 'detail', 'report'].includes(p.page) ? p.page : 'landing';
  const template = HtmlService.createTemplateFromFile('Dashboard');
  template.context = JSON.stringify({
    page, url: ScriptApp.getService().getUrl(),
    params: { demo: p.demo || '', id: p.id || '', from: p.from || '', restore: p.restore || '', anchor: p.anchor || '' },
  });
  return template.evaluate().setTitle('Dự án Ga Metro 2')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function readMetroData() {
  const book = SpreadsheetApp.openById(METRO_SOURCE.id);
  const sheet = book.getSheets().find(tab => tab.getSheetId() === METRO_SOURCE.gid);
  if (!sheet) throw new Error('Không tìm thấy tab DỮ LIỆU TỔNG HỢP.');
  const height = sheet.getLastRow() - METRO_SOURCE.headerRow + 1;
  if (height < 1) throw new Error('Tab tổng hợp chưa có hàng tiêu đề.');
  const grid = sheet.getRange(METRO_SOURCE.headerRow, 1, height, sheet.getLastColumn());
  const values = grid.getValues();
  const display = grid.getDisplayValues();
  return mapMetroRows_(values, display, book.getSpreadsheetTimeZone());
}

function headerKey_(text) {
  return String(text || '').toLowerCase().normalize('NFD')
    .replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
}

function mapMetroRows_(values, display, timezone) {
  const headers = display[0].map(headerKey_);
  const fields = {
    team:['TỔ CÔNG TÁC'], officer:['CÁN BỘ THỤ LÝ'], accountant:['KẾ TOÁN'], stt:['STT'],
    name:['TÊN'], house:['SỐ NHÀ'], street:['ĐƯỜNG'], ward:['PHƯỜNG'], map:['SỐ TỜ'], parcel:['SỐ THỬA'],
    area:['DIỆN TÍCH GIẢI TỎA'], notice:['THÔNG BÁO THU HỒI ĐẤT'], status:['TRẠNG THÁI HỒ SƠ'],
    pact:['TRẠNG THÁI PACT'], plan:['PHƯƠNG ÁN','SỐ PHƯƠNG ÁN'], approval:['QUYẾT ĐỊNH PHÊ DUYỆT PHƯƠNG ÁN'],
    supplementPlan:['PHƯƠNG ÁN BỔ SUNG'], supplementApproval:['QUYẾT ĐỊNH PHÊ DUYỆT PHƯƠNG ÁN ĐIỀU CHỈNH'],
    recovery:['SỐ QUYẾT ĐỊNH THU HỒI ĐẤT'], enforcement:['QUYẾT ĐỊNH CƯỠNG CHẾ'], handover:['BÀN GIAO MẶT BẰNG'],
    handoverDate:['NGÀY BÀN GIAO MẶT BẰNG'], temporaryDecision:['QUYẾT ĐỊNH CHI TIỀN TẠM CƯ'],
    note:['GHI CHÚ VỀ TÌNH TRẠNG GIẢI CHI'], opinion:['Ý KIẾN HỘ DÂN KHI GIẢI CHI'], code:['MÃ HỒ SƠ'],
    initialEstimate:['DỰ TOÁN BỒI THƯỜNG LẦN ĐẦU','DỰ TOÁN BỒI THƯỜNG'],
    initialPaid:['TIỀN BỒI THƯỜNG LẦN ĐẦU','TIỀN BỒI THƯỜNG'],
    initialDate:['NGÀY CHI TIỀN BỒI THƯỜNG LẦN ĐẦU','NGÀY CHI TIỀN BỒI THƯỜNG'],
    initialDecision:['QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN BT','QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN'],
    handoverEstimate:['DỰ TOÁN BÀN GIAO MẶT BẰNG'], handoverPaid:['TIỀN BÀN GIAO MẶT BẰNG'],
    handoverPaidDate:['NGÀY CHI TIỀN BÀN GIAO MẶT BẰNG'], handoverDecision:['QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN BGMB'],
    supplementEstimate:['DỰ TOÁN BTBS, NVTC','DỰ TOÁN BT BS, NVTC'],
    supplementPaid:['TIỀN BỒI THƯỜNG BỔ SUNG'], supplementDate:['NGÀY CHI TIỀN BỒI THƯỜNG BỔ SUNG'],
    obligationPaid:['TIỀN NGHĨA VỤ TÀI CHÍNH'], obligationDate:['NGÀY CHI NGHĨA VỤ TÀI CHÍNH'],
    supplementDecision:['QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN BTBS, NVTC','QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN BT BS, NVTC'],
    temporaryEstimate:['DỰ TOÁN TẠM CƯ','SỐ TIỀN TẠM CƯ ĐƯỢC DUYỆT'],
    temporaryPaid:['TIỀN TẠM CƯ'], temporaryDate:['NGÀY CHI TIỀN TẠM CƯ'],
    temporaryBudgetDecision:['QUYẾT ĐỊNH PHÊ DUYỆT DỰ TOÁN TẠM CƯ'],
  };
  const columns = {};
  Object.entries(fields).forEach(([key, names]) => {
    columns[key] = names.map(name => headers.indexOf(headerKey_(name))).find(col => col >= 0) ?? -1;
  });
  if (['team','name','stt'].some(key => columns[key] < 0)) throw new Error('Thiếu tiêu đề Tổ công tác, Tên hoặc STT ở hàng 3.');
  const pending = ['supplementEstimate','supplementPaid','supplementDate','temporaryEstimate'].filter(key => columns[key] < 0);
  const usedIds = new Set();
  const invalidAmounts = new Set();
  const records = [];
  for (let index = 1; index < display.length; index++) {
    const text = key => String(display[index][columns[key]] ?? '').trim();
    const teamKey = headerKey_(text('team'));
    if (!/^to [12]$/.test(teamKey) || !text('name')) continue;
    const id = text('code') || (text('stt') ? 'STT-' + text('stt') : '');
    if (!id || usedIds.has(id)) throw new Error('Thiếu hoặc trùng mã hồ sơ/STT tại dòng ' + (METRO_SOURCE.headerRow + index) + '.');
    usedIds.add(id);
    const number = key => {
      const input = values[index][columns[key]];
      if (typeof input === 'number' && Number.isFinite(input)) return input;
      if (input === '' || input == null || /^[-–—]$/.test(String(input).trim())) return null;
      invalidAmounts.add(display[0][columns[key]]);
      return null;
    };
    const date = key => sheetDate_(values[index][columns[key]], timezone);
    const record = {id, team:'Tổ ' + teamKey.slice(-1)};
    ['stt','name','house','street','ward','map','parcel','area','officer','accountant','notice','status','pact','plan','approval',
      'supplementPlan','supplementApproval','recovery','enforcement','handover','temporaryDecision','note','opinion']
      .forEach(key => { record[key] = text(key); });
    record.handoverDate = date('handoverDate');
    const groups = [
      ['initialEstimate', [['initialPaid','initialDate']], 'initialDecision'],
      ['supplementEstimate', [['supplementPaid','supplementDate'], ['obligationPaid','obligationDate']], 'supplementDecision'],
      ['handoverEstimate', [['handoverPaid','handoverPaidDate']], 'handoverDecision'],
      ['temporaryEstimate', [['temporaryPaid','temporaryDate']], 'temporaryBudgetDecision'],
    ];
    record.paymentEntries = [];
    record.budgetDecisions = groups.map(group => text(group[2]));
    record.groups = groups.map(([budget, cash], group) => {
      const estimate = number(budget);
      const entries = cash.map(([paid, paidDate]) => ({amount:number(paid), date:date(paidDate)}));
      const actual = entries.filter(entry => entry.amount !== null);
      const paid = actual.length ? actual.reduce((total, entry) => total + entry.amount, 0) : null;
      actual.filter(entry => entry.amount !== 0).forEach(entry => record.paymentEntries.push({...entry, group}));
      return [estimate, paid, estimate === null || paid === null ? null : Math.max(0, estimate - paid)];
    });
    records.push(record);
  }
  return {
    records,
    loadedAt: Utilities.formatDate(new Date(), timezone, 'dd/MM/yyyy HH:mm'),
    pendingHeaders: pending.map(key => fields[key][0]),
    invalidAmounts: [...invalidAmounts],
  };
}

function sheetDate_(input, timezone) {
  if (input instanceof Date && !isNaN(input)) return Utilities.formatDate(input, timezone, 'yyyy-MM-dd');
  const text = String(input ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!iso && !local) return null;
  const date = iso ? text : [local[3], local[2].padStart(2,'0'), local[1].padStart(2,'0')].join('-');
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === date ? date : null;
}
