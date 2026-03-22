/**
 * Google Apps Script: синхронизация строк листа в таблицу Cost (Nest API).
 * Логика чтения листа и агрегации совпадает с GoogleSheet.js (P/L, Keitaro_ID, Spent_USD, sub_id_6, Day_Current).
 *
 * Настройки — поправь под свой хост и ключ:
 */
const costs_API_BASE_URL = 'https://localhost:4000'; // без завершающего /
const costs_AUTH_HEADER_NAME = 'Auth';
const costs_AUTH_KEY = 'Samtron123!@#';
const costs_SHEET_NAME = 'P/L';
const costs_EXECUTION_MODE = 'LIVE'; // 'DRY_RUN' | 'LIVE'
const costs_SKIP_ROWS_WITH_UNPARSED_DATE = true;

/**
 * Запуск из редактора (или по триггеру): собирает те же «корзины», что Keitaro-скрипт,
 * и шлёт батчами POST /cost/:Keitaro_Id с полем items.
 */
function syncCostsFromSheetToDb() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(costs_SHEET_NAME);
  if (!sheet) {
    Logger.log('costs: sheet not found: ' + costs_SHEET_NAME);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const displayValues = sheet.getDataRange().getDisplayValues();
  const header = data[0].map((h) => String(h).trim());

  const idCol = costs_findHeaderIndex_(header, ['Keitaro_ID']);
  const spentCol = costs_findHeaderIndex_(header, ['Spent_USD']);
  const subId6Col = costs_findHeaderIndex_(header, ['sub_id_6']);
  const dateCurrentCol = costs_findHeaderIndex_(header, ['Day_Current']);
  let statusCol = costs_findHeaderIndex_(header, ['Cost_DB_Status']);
  const campaignCol = costs_findHeaderIndex_(header, ['Campaign', 'campaign']);
  const adsetCol = costs_findHeaderIndex_(header, ['Adset', 'adset', 'Ad_Set']);
  const adCol = costs_findHeaderIndex_(header, ['Ad', 'ad']);

  if (idCol === -1 || spentCol === -1) {
    Logger.log('costs: need Keitaro_ID and Spent_USD columns');
    return;
  }
  if (dateCurrentCol === -1) {
    Logger.log(
      'costs: column Day_Current not found — abort to avoid wrong dates.',
    );
    return;
  }

  if (statusCol === -1) {
    statusCol = header.length;
    sheet.getRange(1, statusCol + 1).setValue('Cost_DB_Status');
  }

  const totalRows = sheet.getLastRow();
  if (totalRows > 1) {
    sheet.getRange(2, statusCol + 1, totalRows, statusCol + 1).clearContent();
  }

  const tz = Session.getScriptTimeZone() || 'Europe/Vienna';
  const now = new Date();
  const timeStr = Utilities.formatDate(now, tz, 'HH:mm');
  const startStr = Utilities.formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    tz,
    'yyyy-MM-dd 00:00:00',
  );

  const stats = {
    buckets: 0,
    itemsPlanned: 0,
    requestsOk: 0,
    requestsFailed: 0,
    rowsSkippedNoDate: 0,
    amountSkippedNoDate: 0,
  };

  const campaigns = {};

  for (let i = 1; i < data.length; i++) {
    const rawId = String(data[i][idCol]).trim();
    const spent = costs_parseMoneyPrecision_(displayValues[i][spentCol]);
    const sub6 = String(displayValues[i][subId6Col] || '').trim();
    if (!rawId || rawId === '' || rawId === 'undefined' || spent <= 0) continue;

    const dateResolved = costs_resolveStartDateFromSheet_(
      data[i][dateCurrentCol],
      displayValues[i][dateCurrentCol],
      tz,
      startStr,
    );
    const rowStartStr = dateResolved.startStr;

    if (costs_SKIP_ROWS_WITH_UNPARSED_DATE && dateResolved.usedFallback) {
      stats.rowsSkippedNoDate++;
      stats.amountSkippedNoDate += spent;
      continue;
    }

    const dayKey = String(rowStartStr).slice(0, 10);
    const campaignDayKey = `${rawId}__${dayKey}`;

    if (!campaigns[campaignDayKey]) {
      campaigns[campaignDayKey] = {
        campaignId: rawId,
        dayKey: dayKey,
        companyTotal: 0,
        adsTotal: 0,
        noSubTotal: 0,
        baseToSend: 0,
        ads: {},
        rows: [],
        startStr: rowStartStr,
        campaignName:
          campaignCol >= 0
            ? String(displayValues[i][campaignCol] || '').trim() || null
            : null,
        adsetName:
          adsetCol >= 0
            ? String(displayValues[i][adsetCol] || '').trim() || null
            : null,
        adName:
          adCol >= 0
            ? String(displayValues[i][adCol] || '').trim() || null
            : null,
      };
    }

    const camp = campaigns[campaignDayKey];
    camp.companyTotal += spent;
    if (rowStartStr < camp.startStr) camp.startStr = rowStartStr;

    if (sub6) {
      camp.ads[sub6] = (camp.ads[sub6] || 0) + spent;
      camp.adsTotal += spent;
    } else {
      camp.noSubTotal += spent;
    }
    camp.rows.push(i);
  }

  for (const bucketKey in campaigns) {
    const camp = campaigns[bucketKey];
    const cId = camp.campaignId;
    const hasAds = Object.keys(camp.ads).length > 0;

    if (!hasAds) {
      camp.baseToSend = camp.noSubTotal;
    } else if (camp.companyTotal >= camp.adsTotal) {
      camp.baseToSend = camp.noSubTotal;
    } else {
      camp.baseToSend = 0;
    }

    const roundedPlan = costs_buildDistributedSubPlan_(camp.ads, camp.baseToSend);
    const items = [];

    if (!hasAds) {
      const companyAmt = costs_round2_(camp.companyTotal);
      if (companyAmt > 0) {
        items.push(
          costs_buildCostItem_(
            camp.dayKey,
            companyAmt,
            null,
            camp.campaignName,
            camp.adsetName,
            camp.adName,
          ),
        );
      }
    } else {
      for (const sub6 in roundedPlan.ads) {
        const adAmt = roundedPlan.ads[sub6];
        if (adAmt <= 0) continue;
        items.push(
          costs_buildCostItem_(
            camp.dayKey,
            adAmt,
            sub6,
            camp.campaignName,
            camp.adsetName,
            camp.adName,
          ),
        );
      }
    }

    stats.buckets++;
    stats.itemsPlanned += items.length;

    const failed = items.length
      ? !costs_postCostItems_(cId, items)
      : false;

    if (failed) stats.requestsFailed++;
    else if (items.length) stats.requestsOk++;

    const statusText = failed
      ? 'failed'
      : costs_EXECUTION_MODE === 'DRY_RUN'
        ? 'ok (dry-run)'
        : 'ok';
    const msg = `[${timeStr}] Cost DB | day: ${camp.dayKey} | items: ${items.length} | ${statusText}`;
    camp.rows.forEach((idx) =>
      sheet.getRange(idx + 1, statusCol + 1).setValue(msg),
    );

    Logger.log(
      `[${timeStr}] costs | keitaro=${cId} day=${camp.dayKey} items=${items.length} ok=${!failed}`,
    );
  }

  Logger.log(
    `costs FINISH [${timeStr}] mode=${costs_EXECUTION_MODE} buckets=${stats.buckets} items=${stats.itemsPlanned} ok=${stats.requestsOk} fail=${stats.requestsFailed} skippedRows=${stats.rowsSkippedNoDate} skipped$=${costs_round2_(stats.amountSkippedNoDate)}`,
  );
}

function costs_buildCostItem_(
  dayKeyYmd,
  amountUsd,
  fbIdOrSub6,
  campaign,
  adset,
  ad,
) {
  const item = {
    costDate: dayKeyYmd,
    costMod: costs_round2_(amountUsd),
    costModCurrency: 'USD',
    costOriginal: costs_round2_(amountUsd),
    costOriginalCurrency: 'USD',
    status: 'new',
    log: 'google-sheet:costs.js',
  };
  if (fbIdOrSub6) item.fbId = String(fbIdOrSub6);
  if (campaign) item.campaign = campaign;
  if (adset) item.adset = adset;
  if (ad) item.ad = ad;
  return item;
}

function costs_postCostItems_(keitaroId, items) {
  if (costs_EXECUTION_MODE === 'DRY_RUN') return true;
  const url = `${costs_API_BASE_URL}/cost/${encodeURIComponent(keitaroId)}`;
  const payload = JSON.stringify({ items: items });
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          [costs_AUTH_HEADER_NAME]: costs_AUTH_KEY,
        },
        payload: payload,
        muteHttpExceptions: true,
      });
      const code = res.getResponseCode();
      if (code < 300) return true;
      Logger.log(
        `costs API error keitaro=${keitaroId} code=${code} body=${res.getContentText()}`,
      );
    } catch (e) {
      Logger.log(`costs API exception keitaro=${keitaroId} ${e}`);
    }
    if (i < attempts) Utilities.sleep(1500);
  }
  return false;
}

function costs_parseMoneyPrecision_(val) {
  if (!val) return 0;
  const clean = String(val)
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  return parseFloat(clean) || 0;
}

function costs_findHeaderIndex_(header, candidates) {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase().replace(/[\s_]+/g, '');
    if (candidates.some((c) => c.toLowerCase().replace(/[\s_]+/g, '') === h))
      return i;
  }
  return -1;
}

function costs_round2_(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function costs_resolveStartDateFromSheet_(
  rawValue,
  displayValue,
  tz,
  fallbackStartStr,
) {
  if (typeof rawValue === 'number' && isFinite(rawValue) && rawValue > 1000) {
    const millis = Math.round((rawValue - 25569) * 86400 * 1000);
    const fromSerial = new Date(millis);
    if (!isNaN(fromSerial.getTime())) {
      return {
        startStr: Utilities.formatDate(fromSerial, tz, 'yyyy-MM-dd 00:00:00'),
        usedFallback: false,
      };
    }
  }

  if (
    Object.prototype.toString.call(rawValue) === '[object Date]' &&
    !isNaN(rawValue.getTime())
  ) {
    return {
      startStr: Utilities.formatDate(rawValue, tz, 'yyyy-MM-dd 00:00:00'),
      usedFallback: false,
    };
  }

  const txt = String(displayValue || '').trim();
  if (!txt) return { startStr: fallbackStartStr, usedFallback: true };

  const iso = txt.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day, 0, 0, 0);
      if (!isNaN(d.getTime())) {
        return {
          startStr: Utilities.formatDate(d, tz, 'yyyy-MM-dd 00:00:00'),
          usedFallback: false,
        };
      }
    }
  }

  const eu = txt.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (eu) {
    const day = Number(eu[1]);
    const month = Number(eu[2]);
    const year = Number(eu[3]) < 100 ? 2000 + Number(eu[3]) : Number(eu[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day, 0, 0, 0);
      if (!isNaN(d.getTime())) {
        return {
          startStr: Utilities.formatDate(d, tz, 'yyyy-MM-dd 00:00:00'),
          usedFallback: false,
        };
      }
    }
  }

  const jsParsed = new Date(txt);
  if (!isNaN(jsParsed.getTime())) {
    return {
      startStr: Utilities.formatDate(jsParsed, tz, 'yyyy-MM-dd 00:00:00'),
      usedFallback: false,
    };
  }

  return { startStr: fallbackStartStr, usedFallback: true };
}

function costs_buildRoundedPlan_(baseAmount, adsMap) {
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

  for (let j = 0; j < prepared.length && remainder > 0; j++, remainder--) {
    prepared[j].floorCents += 1;
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

function costs_buildDistributedSubPlan_(adsMap, tailAmount) {
  const keys = Object.keys(adsMap);
  if (!keys.length) return { ads: {}, adsTotal: 0, total: 0 };

  const extra = Math.max(0, Number(tailAmount) || 0);
  const perSub = extra / keys.length;
  const expanded = {};
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    expanded[k] = (Number(adsMap[k]) || 0) + perSub;
  }

  const rounded = costs_buildRoundedPlan_(0, expanded);
  return { ads: rounded.ads, adsTotal: rounded.adsTotal, total: rounded.total };
}
