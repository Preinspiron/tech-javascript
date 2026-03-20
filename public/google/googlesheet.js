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
    // Для sub_id_6 важно брать display value, чтобы не терять точный формат идентификатора.
    const sub6 = String(displayValues[i][subId6Col] || '').trim();

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
    let matchedSent = 0;
    let notMatchedSent = 0;
    let failedRequests = 0;
    const hasAds = Object.keys(camp.ads).length > 0;

    // Кейс 1: только кампания без sub_id_6 -> шлем всю сумму.
    // Кейс 2: только sub_id_6 -> baseToSend=0, шлем только sub_id_6.
    // Кейс 3: есть и кампания и sub_id_6 -> шлем baseToSend (total - ads), затем sub_id_6.
    if (!hasAds) {
      camp.baseToSend = camp.companyTotal;
    } else if (camp.companyTotal >= camp.adsTotal) {
      camp.baseToSend = camp.companyTotal - camp.adsTotal;
    } else {
      // Если источник уже дает "остаток" отдельными строками, не уходим в минус.
      camp.baseToSend = 0;
    }

    const roundedPlan = buildRoundedPlan_(camp.baseToSend, camp.ads);

    // A) Шлем базовую сумму на кампанию без фильтра.
    // В Keitaro фильтр sub_id_6='' часто не срабатывает как "пустое значение",
    // из-за этого base-слой может не примениться и итог становится меньше.
    const baseSubFilter = null;
    if (roundedPlan.base > 0) {
      if (sendToKeitaroWithRetry_(cId, roundedPlan.base, startStr, endStr, tz, baseSubFilter)) {
        campSent += roundedPlan.base;
        notMatchedSent += roundedPlan.base;
      } else {
        failedRequests++;
      }
    }

    // Небольшая пауза между слоями, чтобы Keitaro успел применить базовую сумму.
    if (roundedPlan.base > 0 && hasAds) {
      Utilities.sleep(5000);
    }

    // B) Шлем точные суммы по sub_id_6
    let adsSum = 0;
    for (const sub6 in roundedPlan.ads) {
      const adAmt = roundedPlan.ads[sub6];
      if (adAmt <= 0) continue;
      if (sendToKeitaroWithRetry_(cId, adAmt, startStr, endStr, tz, sub6)) {
        adsSum += adAmt;
        matchedSent += adAmt;
        campSent += adAmt;
      } else {
        failedRequests++;
      }
    }

    stats.totalSent += campSent;

    // Обновляем статус по факту успешной отправки в Keitaro
    const totalSentFact = round2_(campSent);
    const apiCampaignCost = fetchKeitaroCampaignCost_(cId, startStr, endStr, tz);
    const apiPart = apiCampaignCost === null ? ' | API cost: n/a' : ` | API cost: $${round2_(apiCampaignCost).toFixed(2)}`;
    const msg = `[${timeStr}] Total: $${totalSentFact.toFixed(2)} | Total matched: $${matchedSent.toFixed(2)} | Total not matched: $${notMatchedSent.toFixed(2)}${failedRequests ? ` | Failed: ${failedRequests}` : ''}${apiPart}`;
    camp.rows.forEach(idx => sheet.getRange(idx + 1, statusCol + 1).setValue(msg));

    if (String(cId) === '138') {
      Logger.log(`DEBUG_138 expected_total=${round2_(camp.companyTotal)} expected_matched=${round2_(camp.adsTotal)} expected_not_matched=${round2_(camp.baseToSend)} planned_total=${round2_(roundedPlan.total)} planned_matched=${round2_(roundedPlan.adsTotal)} planned_not_matched=${round2_(roundedPlan.base)} sent_total=${totalSentFact} sent_matched=${round2_(matchedSent)} sent_not_matched=${round2_(notMatchedSent)} api_cost=${apiCampaignCost} failed=${failedRequests}`);
    }
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
  
  // null/undefined => отправка на всю кампанию, '' => только пустой sub_id_6, 'abc' => конкретный sub_id_6
  if (subId6 !== null && subId6 !== undefined) payload.filters = { sub_id_6: subId6 };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Api-Key': KEITARO_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const ok = res.getResponseCode() < 300;
    if (!ok) Logger.log(`Keitaro error campaign=${campaignId} sub_id_6="${subId6}" code=${res.getResponseCode()} body=${res.getContentText()}`);
    return ok;
  } catch (e) { return false; }
}

function sendToKeitaroWithRetry_(campaignId, cost, start, end, tz, subId6) {
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    if (sendToKeitaro_(campaignId, cost, start, end, tz, subId6)) return true;
    if (i < attempts) Utilities.sleep(1500);
  }
  Logger.log(`Keitaro failed after retries campaign=${campaignId} sub_id_6="${subId6}" cost=${round2_(cost)}`);
  return false;
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

function buildRoundedPlan_(baseAmount, adsMap) {
  const items = [];
  const safeBase = Math.max(0, Number(baseAmount) || 0);
  if (safeBase > 0) items.push({ key: '__base__', amount: safeBase });

  for (const sub6 in adsMap) {
    const amt = Math.max(0, Number(adsMap[sub6]) || 0);
    if (amt > 0) items.push({ key: sub6, amount: amt });
  }

  const rawTotal = items.reduce((acc, x) => acc + x.amount, 0);
  const targetCents = Math.round((rawTotal + Number.EPSILON) * 100);

  const prepared = items.map((x, idx) => {
    const rawCents = x.amount * 100;
    const floorCents = Math.floor(rawCents + 1e-9);
    return {
      key: x.key,
      floorCents,
      fraction: rawCents - floorCents,
      idx
    };
  });

  let floorSum = prepared.reduce((acc, x) => acc + x.floorCents, 0);
  let remainder = targetCents - floorSum;

  prepared.sort((a, b) => {
    if (b.fraction !== a.fraction) return b.fraction - a.fraction;
    return a.idx - b.idx;
  });

  for (let i = 0; i < prepared.length && remainder > 0; i++, remainder--) {
    prepared[i].floorCents += 1;
  }

  const ads = {};
  let base = 0;
  let adsTotal = 0;
  let total = 0;

  for (const p of prepared) {
    const amt = p.floorCents / 100;
    total += amt;
    if (p.key === '__base__') {
      base = amt;
    } else {
      ads[p.key] = amt;
      adsTotal += amt;
    }
  }

  return { base, ads, adsTotal, total };
}

function fetchKeitaroCampaignCost_(campaignId, start, end, tz) {
  const url = `${KEITARO_BASE_URL}/report/build`;
  const payload = {
    range: {
      from: start,
      to: end,
      timezone: tz
    },
    dimensions: ['campaign_id'],
    measures: ['cost'],
    filters: {
      AND: [
        {
          name: 'campaign_id',
          operator: 'EQUALS',
          expression: String(campaignId)
        }
      ]
    },
    sort: [],
    limit: 1000,
    offset: 0,
    summary: true,
    extended: false
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Api-Key': KEITARO_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() >= 300) {
      Logger.log(`Keitaro report error campaign=${campaignId} code=${res.getResponseCode()} body=${res.getContentText()}`);
      return null;
    }

    const body = JSON.parse(res.getContentText() || '{}');
    const rows = Array.isArray(body.rows) ? body.rows : [];
    let cost = 0;
    for (let i = 0; i < rows.length; i++) {
      cost += Number(rows[i].cost || 0);
    }
    return round2_(cost);
  } catch (e) {
    Logger.log(`Keitaro report exception campaign=${campaignId} err=${e}`);
    return null;
  }
}