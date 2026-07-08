import "server-only";

// Resend REST API を fetch で叩く（SDK不使用）。
// 必要env: RESEND_API_KEY（Resendで取得）, MAIL_FROM（認証済み送信元, 例 "川口典礼 <no-reply@example.jp>"）。
export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMailWithPdf(opts: {
  to: string;
  subject: string;
  html: string;
  pdfBase64?: string; // data URL でなく純base64
  filename?: string;
}): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { ok: false, error: "メール送信が未設定です（RESEND_API_KEY / MAIL_FROM）。管理者にご連絡ください。" };
  if (!opts.to) return { ok: false, error: "送信先メールアドレスがありません。" };
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
