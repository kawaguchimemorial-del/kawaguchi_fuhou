import "server-only";
import nodemailer from "nodemailer";

// メール送信。優先: SMTP(Xserver等) → 未設定時のみ Resend REST API。
// SMTP用env: SMTP_HOST, SMTP_PORT(465=SSL/587=STARTTLS), SMTP_USER, SMTP_PASS, MAIL_FROM
// Resend用env: RESEND_API_KEY, MAIL_FROM
export type MailResult = { ok: true } | { ok: false; error: string };

interface MailOpts {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string; // data URL でなく純base64
  filename?: string;
}

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendViaSmtp(opts: MailOpts): Promise<MailResult> {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || "465");
  const from = process.env.MAIL_FROM || process.env.SMTP_USER!;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465=SSL, 587=STARTTLS
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  const attachments = opts.pdfBase64
    ? [{ filename: opts.filename || "document.pdf", content: opts.pdfBase64, encoding: "base64" as const }]
    : undefined;
  try {
    await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, attachments });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `送信に失敗しました：${e instanceof Error ? e.message : String(e)}` };
  }
}

async function sendViaResend(opts: MailOpts): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { ok: false, error: "メール送信が未設定です（SMTP_* もしくは RESEND_API_KEY / MAIL_FROM）。管理者にご連絡ください。" };
  const attachments = opts.pdfBase64 ? [{ filename: opts.filename || "document.pdf", content: opts.pdfBase64 }] : undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, attachments }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `送信に失敗しました（${res.status}）${t ? "：" + t.slice(0, 200) : ""}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `送信に失敗しました：${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function sendMailWithPdf(opts: MailOpts): Promise<MailResult> {
  if (!opts.to) return { ok: false, error: "送信先メールアドレスがありません。" };
  if (smtpConfigured()) return sendViaSmtp(opts);
  return sendViaResend(opts);
}
