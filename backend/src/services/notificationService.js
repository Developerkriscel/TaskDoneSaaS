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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildFallbackEmailTemplate({
  category = 'Notification',
  action = 'Status Update',
  recipientName = 'Team Member',
  title = '',
  body = '',
  details = {}
} = {}) {
  const safeTitle = String(title || `${category} - ${action}`).trim();
  const safeBody = String(body || 'Please review the latest update in your TaskDone workspace.').trim();
  const detailRows = Object.entries(details || {}).filter(([, v]) => String(v || '').trim().length > 0);
  const detailHtml = detailRows.length
    ? `<table style="width:100%;border-collapse:collapse;margin-top:16px"><tbody>${detailRows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:600">${escapeHtml(k)}</td><td style="padding:8px 10px;border:1px solid #e5e7eb">${escapeHtml(v)}</td></tr>`
        )
        .join('')}</tbody></table>`
    : '';

  const subject = `[TaskDone] ${safeTitle}`;
  const html = [
    '<div style="font-family:Segoe UI,Arial,sans-serif;color:#111827;line-height:1.6;max-width:680px;margin:0 auto">',
    '<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">',
    '<div style="background:#0f172a;color:#ffffff;padding:18px 20px;font-size:18px;font-weight:700">TaskDone Notification</div>',
    '<div style="padding:20px">',
    `<p style="margin:0 0 12px 0">Hello ${escapeHtml(recipientName)},</p>`,
    `<p style="margin:0 0 12px 0">${escapeHtml(safeBody)}</p>`,
    detailHtml,
    '<p style="margin:16px 0 0 0">Regards,<br/>TaskDone System</p>',
    '</div></div></div>'
  ].join('');
  const text = stripHtml(html);

  return { subject, html, text };
}

export async function composeProfessionalEmailTemplate({
  category = 'Notification',
  action = 'Status Update',
  recipientName = 'Team Member',
  title = '',
  body = '',
  details = {}
} = {}) {
  const fallback = buildFallbackEmailTemplate({ category, action, recipientName, title, body, details });
  const apiKey = String(process.env.MISTRAL_API_KEY || '').trim();
  if (!apiKey) return fallback;

  const payload = {
    category,
    action,
    recipientName,
    title: title || '',
    body: body || '',
    details: details && typeof details === 'object' ? details : {}
  };

  const prompt = [
    'Create a professional corporate email in FAANG-style tone.',
    'Rules: no emojis, no slang, concise but complete, formal and operational.',
    'Return strict JSON with keys: subject, html, text.',
    'HTML must be clean, production-safe, and not include scripts or external assets.',
    'Do not include markdown fences.',
    `Input: ${JSON.stringify(payload)}`
  ].join('\n');

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You generate enterprise-ready email content in JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) return fallback;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) return fallback;
    const parsed = JSON.parse(content);

    const subject = String(parsed.subject || fallback.subject).trim() || fallback.subject;
    const html = String(parsed.html || '').trim();
    const text = String(parsed.text || '').trim();
    if (!html) return { subject, html: fallback.html, text: text || fallback.text };
    return { subject, html, text: text || stripHtml(html) };
  } catch {
    return fallback;
  }
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
