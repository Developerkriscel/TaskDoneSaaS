import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    return { success: false, error: 'Email transport not configured.' };
  }
  if (!to) {
    return { success: false, error: 'Missing recipient.' };
  }

  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  const info = await tx.sendMail({ from, to, subject, html, text });
  return { success: true, messageId: info.messageId };
}
