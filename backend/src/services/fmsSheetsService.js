import { google } from 'googleapis';
import { AppSetting } from '../models/AppSetting.js';

function getServiceAccount() {
  const raw = process.env.FMS_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getConnectorSetting() {
  const setting = await AppSetting.findOne({ key: 'fmsSheetId' }).lean();
  if (!setting?.value) {
    return null;
  }

  if (typeof setting.value === 'string') {
    return { sheetId: setting.value, range: process.env.FMS_DEFAULT_RANGE || 'FMS!A2:M' };
  }

  return {
    sheetId: setting.value.sheetId,
    range: setting.value.range || process.env.FMS_DEFAULT_RANGE || 'FMS!A2:M'
  };
}

async function getSheetsClient() {
  const creds = getServiceAccount();
  if (!creds) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

function mapFmsRow(row, indexOffset = 2) {
  return {
    rowId: indexOffset,
    personId: row[0] || '',
    what: row[1] || '',
    when: row[2] || '',
    how: row[3] || '',
    who: row[4] || '',
    fmsName: row[5] || '',
    taskName: row[6] || '',
    stepNo: row[7] || '',
    plannedDate: row[8] || null,
    actualDate: row[9] || null,
    formLink: row[10] || '',
    delayDays: Number(row[11] || 0),
    onTimeStatus: row[12] || 'On Time'
  };
}

export async function fetchFmsRows() {
  const connector = await getConnectorSetting();
  if (!connector?.sheetId) {
    return [];
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    return [];
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: connector.sheetId,
    range: connector.range
  });

  const values = res.data.values || [];
  return values.map((row, i) => mapFmsRow(row, i + 2));
}

export async function markFmsDoneByRow(rowId) {
  const connector = await getConnectorSetting();
  if (!connector?.sheetId) {
    return 'FMS connector not configured.';
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    return 'FMS Sheets API credentials missing.';
  }

  const now = new Date();
  const iso = now.toISOString();
  const targetRow = Number(rowId);
  if (!targetRow || targetRow < 2) {
    return 'Invalid FMS rowId.';
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: connector.sheetId,
    range: `FMS!J${targetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[iso]] }
  });

  return 'success';
}
