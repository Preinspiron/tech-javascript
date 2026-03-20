const KEITARO_BASE_URL = 'https://buddytraff.com/admin_api/v1';
const KEITARO_API_KEY = '7c3dd34eb93c96bc87f50a6810a4e12e';
const SHEET_NAME = 'P/L';

function syncKeitaroCostsHourly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues(); 
  const displayValues = sheet.getDataRange().getDisplayValues(); 
  const header = data[0].map(h => String(h).trim());

  const idCol = findHeaderIndex_(header, ['Keitaro_ID']);
  const spentCol = findHeaderIndex_(header, ['Spent_USD']); 
  const subId6Col = findHeaderIndex_(header, ['sub_id_6']);
  let statusCol = findHeaderIndex_(header, ['Keitaro_Status']);

  if (idCol === -1 || spentCol === -1) return;
  if (statusCol === -1) {
    statusCol = header.length;
    sheet.getRange(1, statusCol + 1).setValue('Keitaro_Status');
  }

  const tz = Session.getScriptTimeZone() || 'Europe/Warsaw';
  const now = new Date();
  const timeStr = Utilities.formatDate(now, tz, 'HH:mm');
  const startStr = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), tz, 'yyyy-MM-dd 00:00:00');
  const endStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');

  let stats = { totalExpected: 0, totalSent: 0, campaigns: {} };

  // 1. Сбор данных
  for (let i = 1; i < data.length; i++) {
    const rawId = String(data[i][idCol]).trim();
    // Берем отображаемое значение (displayValues), чтобы видеть ровно то, что в ячейке
    const spent = parseMoneyPrecision_(displayValues[i][spentCol]);
    const sub6 = String(data[i][subId6Col] || '').trim();

    if (!rawId || rawId === "" || rawId === "undefined" || spent <= 0) continue;

    stats.totalExpected += spent;

    if (!stats.campaigns[rawId]) {
      stats.campaigns[rawId] = { companyTotal: 0, adsTotal: 0, baseToSend: 0, ads: {}, rows: [] };
    }
    
    stats.campaigns[rawId].companyTotal += spent;

    if (sub6) {
      stats.campaigns[rawId].ads[sub6] = (stats.campaigns[rawId].ads[sub6] || 0) + spent;
      stats.campaigns[rawId].adsTotal += spent;
    } else {
      // keep row for campaign total, base amount is calculated later
    }
    stats.campaigns[rawId].rows.push(i);
  }

  // 2. Отправка (БЕЗ ДУБЛИРОВАНИЯ)
  for (const cId in stats.campaigns) {
    const camp = stats.campaigns[cId];
    let campSent = 0;
    const hasAds = Object.keys(camp.ads).length > 0;

    // Кейс 1: только кампания без sub_id_6 -> шлем всю сумму.
    // Кейс 2: только sub_id_6 -> baseToSend=0, шлем только sub_id_6.
    // Кейс 3: есть и кампания и sub_id_6 -> шлем baseToSend (total - ads), затем sub_id_6.
    if (!hasAds) {
      camp.baseToSend = round2_(camp.companyTotal);
    } else if (camp.companyTotal >= camp.adsTotal) {
      camp.baseToSend = round2_(camp.companyTotal - camp.adsTotal);
    } else {
      // Если источник уже дает "остаток" отдельными строками, не уходим в минус.
      camp.baseToSend = 0;
    }

    // A) Шлем базовую сумму на кампанию (без фильтра sub_id_6)
    if (camp.baseToSend > 0) {
      if (sendToKeitaro_(cId, camp.baseToSend, startStr, endStr, tz, null)) {
        campSent += camp.baseToSend;
      }
    }

    // B) Шлем точные суммы по sub_id_6
    let adsSum = 0;
    for (const sub6 in camp.ads) {
      const adAmt = round2_(camp.ads[sub6]);
      if (sendToKeitaro_(cId, adAmt, startStr, endStr, tz, sub6)) {
        adsSum += adAmt;
        campSent += adAmt;
      }
    }

    stats.totalSent += campSent;

    // Обновляем статус в формате total / matched / not matched
    const totalCamp = round2_(camp.companyTotal);
    const totalMatched = round2_(camp.adsTotal);
    const totalNotMatched = round2_(camp.baseToSend);
    const msg = `[${timeStr}] Total: $${totalCamp.toFixed(2)} | Total matched: $${totalMatched.toFixed(2)} | Total not matched: $${totalNotMatched.toFixed(2)}`;
    camp.rows.forEach(idx => sheet.getRange(idx + 1, statusCol + 1).setValue(msg));
  }

  // 3. Отчет
  const summary = 
    `🏁 ФИНИШ [${timeStr}]\n` +
    `----------------------------------\n` +
    `💰 В ТАБЛИЦЕ (U): $${stats.totalExpected.toFixed(2)}\n` +
    `✅ ОТПРАВЛЕНО: $${stats.totalSent.toFixed(2)}\n` +
    `----------------------------------\n` +
    `🏢 Кампаний: ${Object.keys(stats.campaigns).length}`;

  // В триггере SpreadsheetApp.getUi() недоступен, поэтому без падения пишем в лог.
  Logger.log(summary);
}

function sendToKeitaro_(campaignId, cost, start, end, tz, subId6) {
  const url = `${KEITARO_BASE_URL}/campaigns/${campaignId}/update_costs`;
  const payload = {
    start_date: start,
    end_date: end,
    timezone: tz,
    cost: round2_(cost),
    currency: 'USD',
    only_campaign_uniques: false
  };
  
  if (subId6) payload.filters = { sub_id_6: subId6 };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Api-Key': KEITARO_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return res.getResponseCode() < 300;
  } catch (e) { return false; }
}

function parseMoneyPrecision_(val) {
  if (!val) return 0;
  let clean = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

function findHeaderIndex_(header, candidates) {
  for (let i = 0; i < header.length; i++) {
    let h = header[i].toLowerCase().replace(/[\s_]+/g, '');
    if (candidates.some(c => c.toLowerCase().replace(/[\s_]+/g, '') === h)) return i;
  }
  return -1;
}

function round2_(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}