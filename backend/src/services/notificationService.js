import nodemailer from 'nodemailer';
import { AppSetting } from '../models/AppSetting.js';

const transporters = new Map();
let transportCache = null;
let transportCacheAt = 0;

const SETTINGS_KEY = 'platformNotificationSettings';
function getCompanySettingsKey(companyId) {
  return `${SETTINGS_KEY}:${String(companyId || '').trim()}`;
}

function sanitizePort(value, fallback = 587) {
  const port = Number(value);
  return Number.isFinite(port) && port > 0 ? port : fallback;
}

async function getDbMailSettings(companyId = null) {
  const now = Date.now();
  const cacheKey = companyId ? getCompanySettingsKey(companyId) : SETTINGS_KEY;
  if (transportCache && transportCache.key === cacheKey && now - transportCacheAt < 60_000) {
    return transportCache;
  }

  const row = await AppSetting.findOne({ key: cacheKey }).select('value').lean();
  const value = row?.value && typeof row.value === 'object' ? row.value : {};
  transportCache = { key: cacheKey, ...value };
  transportCacheAt = now;
  return transportCache;
}

async function getTransporter(companyId = null) {
  const cacheKey = companyId ? getCompanySettingsKey(companyId) : SETTINGS_KEY;
  if (transporters.has(cacheKey)) return transporters.get(cacheKey);

  const dbSettings = await getDbMailSettings(companyId);
  const smtp = dbSettings?.smtp && typeof dbSettings.smtp === 'object' ? dbSettings.smtp : {};
  const host = smtp.host || process.env.MAIL_HOST;
  const port = sanitizePort(smtp.port || process.env.MAIL_PORT, 587);
  const user = smtp.user || process.env.MAIL_USER;
  const pass = smtp.password || process.env.MAIL_PASS;
  const secure = typeof smtp.secure === 'boolean' ? smtp.secure : port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  transporters.set(cacheKey, transporter);
  return transporter;
}

export async function sendEmail({ to, subject, html, text, companyId = null }) {
  const tx = await getTransporter(companyId);
  if (!tx) {
    return { success: false, error: 'Email transport not configured.' };
  }
  if (!to) {
    return { success: false, error: 'Missing recipient.' };
  }

  const dbSettings = await getDbMailSettings(companyId);
  const sender = dbSettings?.sender && typeof dbSettings.sender === 'object' ? dbSettings.sender : {};
  const from = sender.fromEmail || process.env.MAIL_FROM || process.env.MAIL_USER;
  const fromName = sender.fromName ? `"${sender.fromName}" <${from}>` : from;
  const replyTo = sender.replyTo || undefined;
  const info = await tx.sendMail({ from: fromName, replyTo, to, subject, html, text });
  return { success: true, messageId: info.messageId };
}

export function resetMailTransportCache() {
  transporters.clear();
  transportCache = null;
  transportCacheAt = 0;
}
