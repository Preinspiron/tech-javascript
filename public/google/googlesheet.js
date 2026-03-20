const KEITARO_BASE_URL = 'https://buddytraff.com/admin_api/v1';
const KEITARO_API_KEY = '7c3dd34eb93c96bc87f50a6810a4e12e';
const SHEET_NAME = 'P/L';
const EXECUTION_MODE = 'LIVE'; // 'DRY_RUN' | 'LIVE'

function syncKeitaroCostsHourly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const header = data[0].map((h) => String(h).trim());

  const idCol = findHeaderIndex_(header, ['Keitaro_ID']);
  const spentCol = findHeaderIndex_(header, ['Spent_USD']);
  const subId6Col = findHeaderIndex_(header, ['sub_id_6']);
  let statusCol = findHeaderIndex_(header, ['Keitaro_Status']);

  if (idCol === -1 || spentCol === -1) return;
  if (statusCol === -1) {
    statusCol = header.length;
    sheet.getRange(1, statusCol + 1).setValue('Keitaro_Status');
  }

  const tz = Session.getScriptTimeZone() || 'Europe/Vienna';
  const now = new Date();
  const timeStr = Utilities.formatDate(now, tz, 'HH:mm');
  const startStr = Utilities.formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    tz,
    'yyyy-MM-dd 00:00:00',
  );
  const endStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss');

  let stats = {
    totalExpectedRaw: 0,
    totalPlanned: 0,
    totalSent: 0,
    campaigns: {},
    requestsOk: 0,
    requestsFailed: 0,
    campaignsFailed: 0,
  };

  // 1. Сбор данных
  for (let i = 1; i < data.length; i++) {
    const rawId = String(data[i][idCol]).trim();
    // Берем отображаемое значение (displayValues), чтобы видеть ровно то, что в ячейке
    const spent = parseMoneyPrecision_(displayValues[i][spentCol]);
    // Для sub_id_6 важно брать display value, чтобы не терять точный формат идентификатора.
    const sub6 = String(displayValues[i][subId6Col] || '').trim();

    if (!rawId || rawId === '' || rawId === 'undefined' || spent <= 0) continue;

    stats.totalExpectedRaw += spent;

    if (!stats.campaigns[rawId]) {
      stats.campaigns[rawId] = {
        companyTotal: 0,
        adsTotal: 0,
        noSubTotal: 0,
        baseToSend: 0,
        ads: {},
        rows: [],
      };
    }

    stats.campaigns[rawId].companyTotal += spent;

    if (sub6) {
      stats.campaigns[rawId].ads[sub6] =
        (stats.campaigns[rawId].ads[sub6] || 0) + spent;
      stats.campaigns[rawId].adsTotal += spent;
    } else {
      stats.campaigns[rawId].noSubTotal += spent;
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
    // Кейс 2: только sub_id_6 -> шлем только sub_id_6.
    // Кейс 3: есть sub_id_6 и хвост -> хвост равномерно распределяем по sub_id_6.
    if (!hasAds) {
      camp.baseToSend = camp.noSubTotal;
    } else if (camp.companyTotal >= camp.adsTotal) {
      // Хвост считаем напрямую по строкам без sub_id_6, чтобы статус совпадал с ручным подсчетом.
      camp.baseToSend = camp.noSubTotal;
    } else {
      // Если источник уже дает "остаток" отдельными строками, не уходим в минус.
      camp.baseToSend = 0;
    }

    const roundedPlan = buildDistributedSubPlan_(camp.ads, camp.baseToSend);
    const caseName = !hasAds
      ? 'CASE_1_COMPANY_ONLY'
      : camp.baseToSend > 0
        ? 'CASE_3_MIX_DISTRIBUTED'
        : 'CASE_2_SUB_ONLY';
    const campaignPlanned = !hasAds
      ? round2_(camp.companyTotal)
      : round2_(roundedPlan.total);
    const totalRows = round2_(camp.companyTotal);
    const matchedRows = round2_(camp.adsTotal);
    const tailRows = round2_(camp.noSubTotal);
    stats.totalPlanned += campaignPlanned;

    // Кейс 1: если sub_id_6 нет, шлем на кампанию.
    if (!hasAds) {
      const companyAmt = round2_(camp.companyTotal);
      if (companyAmt > 0) {
        if (applyCostByMode_(cId, companyAmt, startStr, endStr, tz, null)) {
          campSent += companyAmt;
          notMatchedSent += companyAmt;
          stats.requestsOk++;
        } else {
          failedRequests++;
          stats.requestsFailed++;
        }
      }
    } else {
      // Кейс 2/3: шлем только по sub_id_6.
      // Если есть хвост (без sub_id_6), он уже равномерно распределен по всем sub_id_6.
      notMatchedSent = tailRows;
      for (const sub6 in roundedPlan.ads) {
        const adAmt = roundedPlan.ads[sub6];
        if (adAmt <= 0) continue;
        if (applyCostByMode_(cId, adAmt, startStr, endStr, tz, sub6)) {
          matchedSent += adAmt;
          campSent += adAmt;
          stats.requestsOk++;
        } else {
          failedRequests++;
          stats.requestsFailed++;
        }
      }
    }

    stats.totalSent += campSent;
    if (failedRequests > 0) stats.campaignsFailed++;

    // Понятный статус в таблице.
    const totalSentFact = round2_(campSent);
    const statusText = failedRequests
      ? 'failed'
      : EXECUTION_MODE === 'DRY_RUN'
        ? 'ok (dry-run)'
        : 'ok';
    const msg = `[${timeStr}] Total campaign: $${totalRows.toFixed(
      2,
    )} | Tails: $${tailRows.toFixed(2)} | Matched: $${matchedRows.toFixed(
      2,
    )} | Status: ${statusText}`;
    camp.rows.forEach((idx) =>
      sheet.getRange(idx + 1, statusCol + 1).setValue(msg),
    );

    const syncStatus = failedRequests ? 'FAILED' : 'OK';
    Logger.log(
      `[${timeStr}] SYNC | campaign: ${cId} | mode: ${EXECUTION_MODE} | case: ${caseName} | total: $${totalRows.toFixed(
        2,
      )} | tails: $${tailRows.toFixed(2)} | matched: $${matchedRows.toFixed(
        2,
      )} | sent: $${totalSentFact.toFixed(
        2,
      )} | failed_requests: ${failedRequests} | status: ${syncStatus}`,
    );
  }

  // 3. Отчет
  const summary =
    `🏁 ФИНИШ [${timeStr}]\n` +
    `⚙️ РЕЖИМ: ${EXECUTION_MODE}\n` +
    `----------------------------------\n` +
    `💰 В ТАБЛИЦЕ (U raw): $${stats.totalExpectedRaw.toFixed(2)}\n` +
    `🧮 ПЛАН К ОТПРАВКЕ: $${stats.totalPlanned.toFixed(2)}\n` +
    `✅ ОТПРАВЛЕНО: $${stats.totalSent.toFixed(2)}\n` +
    `📤 УСПЕШНЫХ ЗАПРОСОВ: ${stats.requestsOk}\n` +
    `❌ НЕУДАЧНЫХ ЗАПРОСОВ: ${stats.requestsFailed}\n` +
    `⚠️ КАМПАНИЙ С ОШИБКАМИ: ${stats.campaignsFailed}\n` +
    `----------------------------------\n` +
    `🏢 Кампаний: ${Object.keys(stats.campaigns).length}`;

  // В триггере SpreadsheetApp.getUi() недоступен, поэтому без падения пишем в лог.
  Logger.log(summary);
}

function applyCostByMode_(campaignId, cost, start, end, tz, subId6) {
  if (EXECUTION_MODE === 'DRY_RUN') return true;
  return sendToKeitaroWithRetry_(campaignId, cost, start, end, tz, subId6);
}

function dryRunKeitaroMathAudit() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const header = data[0].map((h) => String(h).trim());
  const idCol = findHeaderIndex_(header, ['Keitaro_ID']);
  const spentCol = findHeaderIndex_(header, ['Spent_USD']);
  const subId6Col = findHeaderIndex_(header, ['sub_id_6']);
  const aaCol = 26;
  if (idCol === -1 || spentCol === -1) return;

  const campaigns = {};
  let raw = 0;
  for (let i = 1; i < data.length; i++) {
    const aaValue = String(displayValues[i][aaCol] || '').trim();
    if (!aaValue) continue;
    const cId = String(data[i][idCol] || '').trim();
    const spent = parseMoneyPrecision_(displayValues[i][spentCol]);
    const sub6 = String(displayValues[i][subId6Col] || '').trim();
    if (!cId || cId === 'undefined' || spent <= 0) continue;
    raw += spent;
    if (!campaigns[cId])
      campaigns[cId] = { companyTotal: 0, adsTotal: 0, noSubTotal: 0, ads: {} };
    campaigns[cId].companyTotal += spent;
    if (sub6) {
      campaigns[cId].ads[sub6] = (campaigns[cId].ads[sub6] || 0) + spent;
      campaigns[cId].adsTotal += spent;
    } else {
      campaigns[cId].noSubTotal += spent;
    }
  }

  let planned = 0;
  let bad = 0;
  for (const cId in campaigns) {
    const c = campaigns[cId];
    const hasAds = Object.keys(c.ads).length > 0;
    const tail = hasAds ? c.noSubTotal : c.companyTotal;
    const dist = hasAds
      ? buildDistributedSubPlan_(c.ads, tail)
      : { total: round2_(c.companyTotal) };
    const p = round2_(hasAds ? dist.total : c.companyTotal);
    planned += p;
    if (Math.abs(round2_(c.companyTotal) - p) > 0.01) {
      bad++;
      Logger.log(
        `AUDIT_MISMATCH campaign=${cId} total_rows=${round2_(
          c.companyTotal,
        )} planned_send=${p} matched_rows=${round2_(
          c.adsTotal,
        )} tail_rows=${round2_(c.noSubTotal)}`,
      );
    }
  }

  Logger.log(
    `AUDIT_SUMMARY raw_rows=${round2_(raw)} planned_send=${round2_(
      planned,
    )} diff=${round2_(round2_(raw) - round2_(planned))} campaigns=${
      Object.keys(campaigns).length
    } mismatches=${bad}`,
  );
}

function sendToKeitaro_(campaignId, cost, start, end, tz, subId6) {
  const url = `${KEITARO_BASE_URL}/campaigns/${campaignId}/update_costs`;
  const payload = {
    start_date: start,
    end_date: end,
    timezone: tz,
    // cost: round2_(cost),
    cost: 0,
    currency: 'USD',
    // only_campaign_uniques: false
  };

  // null/undefined => отправка на всю кампанию, '' => только пустой sub_id_6, 'abc' => конкретный sub_id_6
  if (subId6 !== null && subId6 !== undefined)
    payload.filters = { sub_id_6: subId6 };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Api-Key': KEITARO_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const ok = res.getResponseCode() < 300;
    if (!ok)
      Logger.log(
        `Keitaro error campaign=${campaignId} sub_id_6="${subId6}" code=${res.getResponseCode()} body=${res.getContentText()}`,
      );
    return ok;
  } catch (e) {
    return false;
  }
}

function sendToKeitaroWithRetry_(campaignId, cost, start, end, tz, subId6) {
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    if (sendToKeitaro_(campaignId, cost, start, end, tz, subId6)) return true;
    if (i < attempts) Utilities.sleep(1500);
  }
  Logger.log(
    `Keitaro failed after retries campaign=${campaignId} sub_id_6="${subId6}" cost=${round2_(
      cost,
    )}`,
  );
  return false;
}

function parseMoneyPrecision_(val) {
  if (!val) return 0;
  let clean = String(val)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  return parseFloat(clean) || 0;
}

function findHeaderIndex_(header, candidates) {
  for (let i = 0; i < header.length; i++) {
    let h = header[i].toLowerCase().replace(/[\s_]+/g, '');
    if (candidates.some((c) => c.toLowerCase().replace(/[\s_]+/g, '') === h))
      return i;
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
      idx,
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

function buildDistributedSubPlan_(adsMap, tailAmount) {
  const keys = Object.keys(adsMap);
  if (!keys.length) return { ads: {}, adsTotal: 0, total: 0 };

  const extra = Math.max(0, Number(tailAmount) || 0);
  const perSub = extra / keys.length;
  const expanded = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    expanded[k] = (Number(adsMap[k]) || 0) + perSub;
  }

  const rounded = buildRoundedPlan_(0, expanded);
  return { ads: rounded.ads, adsTotal: rounded.adsTotal, total: rounded.total };
}
