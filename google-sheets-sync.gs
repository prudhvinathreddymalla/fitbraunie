const SHEETS = {
  entries: "Daily Entries",
  metrics: "Weekly Metrics",
  goals: "Goals",
  events: "Sync Events"
};

function doPost(e) {
  const payloadText = e.parameter.payload;
  if (!payloadText) {
    return jsonResponse({ ok: false, error: "Missing payload" });
  }

  const payload = JSON.parse(payloadText);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    writeDailyEntries(spreadsheet, payload);
    writeWeeklyMetrics(spreadsheet, payload);
    writeGoals(spreadsheet, payload);
    writeSyncEvent(spreadsheet, payload);
    return jsonResponse({ ok: true, syncedAt: new Date().toISOString() });
  } finally {
    lock.releaseLock();
  }
}

function writeDailyEntries(spreadsheet, payload) {
  const sheet = getSheet(spreadsheet, SHEETS.entries, [
    "Date",
    "Time",
    "Type",
    "Name",
    "Exercise",
    "Sets",
    "Reps",
    "Weight",
    "RIR",
    "Minutes",
    "Water",
    "Calories",
    "Protein",
    "Carbs",
    "Fat"
  ]);

  removeRowsWhere(sheet, 1, payload.dayKey);

  const rows = (payload.daily.entries || []).map((entry) => [
    payload.dayKey,
    entry.time || "",
    entry.type || "",
    entry.name || "",
    entry.exercise || "",
    entry.sets || "",
    entry.reps || "",
    entry.weight || "",
    entry.rir || "",
    entry.minutes || "",
    entry.water || "",
    entry.calories || "",
    entry.protein || "",
    entry.carbs || "",
    entry.fat || ""
  ]);

  appendRows(sheet, rows);
}

function writeWeeklyMetrics(spreadsheet, payload) {
  const sheet = getSheet(spreadsheet, SHEETS.metrics, [
    "Week",
    "Weight",
    "Waist",
    "Sleep",
    "Running km",
    "Knee pain",
    "Notes"
  ]);

  clearBody(sheet);

  const rows = Object.entries(payload.weeklyMetrics || {}).map(([week, metrics]) => [
    week,
    metrics.weight || "",
    metrics.waist || "",
    metrics.sleep || "",
    metrics.running || "",
    metrics.knee || "",
    metrics.notes || ""
  ]);

  appendRows(sheet, rows);
}

function writeGoals(spreadsheet, payload) {
  const sheet = getSheet(spreadsheet, SHEETS.goals, [
    "Goal",
    "Value"
  ]);

  clearBody(sheet);

  const goals = payload.goals || {};
  appendRows(sheet, [
    ["Calories", goals.calories || ""],
    ["Protein", goals.protein || ""],
    ["Water", goals.water || ""],
    ["Weight", goals.weight || ""],
    ["Active Week", payload.activeWeek || ""]
  ]);
}

function writeSyncEvent(spreadsheet, payload) {
  const sheet = getSheet(spreadsheet, SHEETS.events, [
    "Synced At",
    "App",
    "Version",
    "Date",
    "Active Week",
    "Daily Entry Count"
  ]);

  appendRows(sheet, [[
    payload.syncedAt || new Date().toISOString(),
    payload.app || "fitbraunie",
    payload.version || "",
    payload.dayKey || "",
    payload.activeWeek || "",
    (payload.daily.entries || []).length
  ]]);
}

function getSheet(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clearBody(sheet) {
  const rows = sheet.getLastRow() - 1;
  if (rows > 0) {
    sheet.deleteRows(2, rows);
  }
}

function removeRowsWhere(sheet, column, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const values = sheet.getRange(2, column, lastRow - 1, 1).getValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (String(values[index][0]) === String(value)) {
      sheet.deleteRow(index + 2);
    }
  }
}

function appendRows(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
