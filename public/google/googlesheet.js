const KEITARO_BASE_URL = 'https://buddytraff.com/admin_api/v1';
const KEITARO_API_KEY = '7c3dd34eb93c96bc87f50a6810a4e12e';
const SHEET_NAME = 'P/L';
const EXECUTION_MODE = 'LIVE'; // 'DRY_RUN' | 'LIVE'
const SKIP_ROWS_WITH_UNPARSED_DATE = true; // safer than sending to fallback day

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
  const dateCurrentCol = findHeaderIndex_(header, ['Day_Current']);
  let statusCol = findHeaderIndex_(header, ['Keitaro_Status']);

  if (idCol === -1 || spentCol === -1) return;
  if (dateCurrentCol === -1) {
    Logger.log(
      'CONFIG_ERROR: column "Date_Current" not found. Sync aborted to avoid wrong day aggregation.',
    );
    return;
  }
  if (statusCol === -1) {
    statusCol = header.length;
    sheet.getRange(1, statusCol + 1).setValue('Keitaro_Status');
  }
  // Очищаем статус перед каждым запуском (кроме заголовка).
  const totalRows = sheet.getLastRow();
  if (totalRows > 1) {
    sheet.getRange(2, statusCol + 1, totalRows - 1, 1).clearContent();
  }

  const tz = Session.getScriptTimeZone() || 'Europe/Vienna';
  const now = new Date();
  const timeStr = Utilities.formatDate(now, tz, 'HH:mm');
  const startStr = Utilities.formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
    tz,
    'yyyy-MM-dd 00:00:00',
  );

  let stats = {
    totalExpectedRaw: 0,
    totalPlanned: 0,
    totalSent: 0,
    campaigns: {},
    requestsOk: 0,
    requestsFailed: 0,
    campaignsFailed: 0,
    dateParsedOk: 0,
    dateFallbackUsed: 0,
    rowsSkippedNoDate: 0,
    amountSkippedNoDate: 0,
  };
  const dateSamples = {};

  // 1. Сбор данных
  for (let i = 1; i < data.length; i++) {
    const rawId = String(data[i][idCol]).trim();
    // Берем отображаемое значение (displayValues), чтобы видеть ровно то, что в ячейке
    const spent = parseMoneyPrecision_(displayValues[i][spentCol]);
    // Для sub_id_6 важно брать display value, чтобы не терять точный формат идентификатора.
    const sub6 = String(displayValues[i][subId6Col] || '').trim();
    if (!rawId || rawId === '' || rawId === 'undefined' || spent <= 0) continue;

    const dateResolved = resolveStartDateFromSheet_(
      data[i][dateCurrentCol],
      displayValues[i][dateCurrentCol],
      tz,
      startStr,
    );
    const rowStartStr = dateResolved.startStr;
    if (dateResolved.usedFallback) {
      stats.dateFallbackUsed++;
      if (Object.keys(dateSamples).length < 10) {
        const rawSample = data[i][dateCurrentCol];
        const displaySample = displayValues[i][dateCurrentCol];
        dateSamples[`row_${i + 1}`] = {
          raw: String(rawSample),
          display: String(displaySample),
        };
      }
    } else {
      stats.dateParsedOk++;
    }

    if (SKIP_ROWS_WITH_UNPARSED_DATE && dateResolved.usedFallback) {
      stats.rowsSkippedNoDate++;
      stats.amountSkippedNoDate += spent;
      continue;
    }

    stats.totalExpectedRaw += spent;

    const dayKey = String(rowStartStr).slice(0, 10);
    const campaignDayKey = `${rawId}__${dayKey}`;

    if (!stats.campaigns[campaignDayKey]) {
      stats.campaigns[campaignDayKey] = {
        campaignId: rawId,
        dayKey: dayKey,
        companyTotal: 0,
        adsTotal: 0,
        noSubTotal: 0,
        baseToSend: 0,
        ads: {},
        rows: [],
        startStr: rowStartStr,
      };
    }

    stats.campaigns[campaignDayKey].companyTotal += spent;
    // Внутри одного campaign+day оставляем самую раннюю дату как защиту от кривых форматов.
    if (rowStartStr < stats.campaigns[campaignDayKey].startStr) {
      stats.campaigns[campaignDayKey].startStr = rowStartStr;
    }

    if (sub6) {
      stats.campaigns[campaignDayKey].ads[sub6] =
        (stats.campaigns[campaignDayKey].ads[sub6] || 0) + spent;
      stats.campaigns[campaignDayKey].adsTotal += spent;
    } else {
      stats.campaigns[campaignDayKey].noSubTotal += spent;
    }
    stats.campaigns[campaignDayKey].rows.push(i);
  }

  // 2. Отправка (БЕЗ ДУБЛИРОВАНИЯ)
  for (const bucketKey in stats.campaigns) {
    const camp = stats.campaigns[bucketKey];
    const cId = camp.campaignId;
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
      const campaignStartStr = camp.startStr || startStr;
      const campaignEndStr = resolveEndDateFromStart_(campaignStartStr, tz);
      if (companyAmt > 0) {
        if (
          applyCostByMode_(
            cId,
            companyAmt,
            campaignStartStr,
            campaignEndStr,
            tz,
            null,
          )
        ) {
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
      const campaignStartStr = camp.startStr || startStr;
      const campaignEndStr = resolveEndDateFromStart_(campaignStartStr, tz);
      notMatchedSent = tailRows;
      for (const sub6 in roundedPlan.ads) {
        const adAmt = roundedPlan.ads[sub6];
        if (adAmt <= 0) continue;
        if (
          applyCostByMode_(
            cId,
            adAmt,
            campaignStartStr,
            campaignEndStr,
            tz,
            sub6,
          )
        ) {
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
    const msg = `[${timeStr}] Date: ${
      camp.dayKey
    } | Total campaign: $${totalRows.toFixed(2)} | Tails: $${tailRows.toFixed(
      2,
    )} | Matched: $${matchedRows.toFixed(2)} | Status: ${statusText}`;
    camp.rows.forEach((idx) =>
      sheet.getRange(idx + 1, statusCol + 1).setValue(msg),
    );

    const syncStatus = failedRequests ? 'FAILED' : 'OK';
    Logger.log(
      `[${timeStr}] SYNC | campaign: ${cId} | day: ${
        camp.dayKey
      } | mode: ${EXECUTION_MODE} | case: ${caseName} | total: $${totalRows.toFixed(
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
    `🗓️ DATE PARSED OK: ${stats.dateParsedOk}\n` +
    `🧯 DATE FALLBACK USED: ${stats.dateFallbackUsed}\n` +
    `⏭️ ROWS SKIPPED (NO DATE): ${stats.rowsSkippedNoDate}\n` +
    `💸 AMOUNT SKIPPED (NO DATE): $${stats.amountSkippedNoDate.toFixed(2)}\n` +
    `----------------------------------\n` +
    `🧩 Групп campaign+day: ${Object.keys(stats.campaigns).length}`;

  // В триггере SpreadsheetApp.getUi() недоступен, поэтому без падения пишем в лог.
  Logger.log(summary);
  if (stats.dateFallbackUsed > 0) {
    Logger.log(`DATE_FALLBACK_SAMPLES ${JSON.stringify(dateSamples)}`);
  }
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
    cost: round2_(cost),
    // cost: 0,
    currency: 'USD',
    only_campaign_uniques: false,
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

function resolveStartDateFromSheet_(
  rawValue,
  displayValue,
  tz,
  fallbackStartStr,
) {
  if (typeof rawValue === 'number' && isFinite(rawValue) && rawValue > 1000) {
    // Google Sheets serial date (days since 1899-12-30).
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

  // Поддерживаем форматы yyyy-MM-dd / yyyy.MM.dd / yyyy/MM/dd (и с временем после даты).
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

  // Поддерживаем форматы dd.MM.yyyy / dd.MM.yy и их варианты с разделителями.
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

  // Последняя попытка: встроенный парсер JS (например, "Mar 21 2026").
  const jsParsed = new Date(txt);
  if (!isNaN(jsParsed.getTime())) {
    return {
      startStr: Utilities.formatDate(jsParsed, tz, 'yyyy-MM-dd 00:00:00'),
      usedFallback: false,
    };
  }

  return { startStr: fallbackStartStr, usedFallback: true };
}

function resolveEndDateFromStart_(startStr, tz) {
  const parsed = new Date(startStr);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(
      new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        23,
        59,
        59,
      ),
      tz,
      'yyyy-MM-dd HH:mm:ss',
    );
  }

  const m = String(startStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      23,
      59,
      59,
    );
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss');
    }
  }

  const now = new Date();
  return Utilities.formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59),
    tz,
    'yyyy-MM-dd HH:mm:ss',
  );
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
