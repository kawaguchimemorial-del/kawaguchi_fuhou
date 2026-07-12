import { sendMailWithPdf } from "@/lib/kanri/mail";

export const dynamic = "force-dynamic";
export const preferredRegion = "hnd1"; // Tokyo (Xserver国外IP制限回避のテスト)

// 一時的なメール送信テスト用エンドポイント(確認後に削除)。
// ?key=kawaguchi-mailtest-9f3a &to=<宛先>
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== "kawaguchi-mailtest-9f3a") {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const to = url.searchParams.get("to") || "kawaguchi.memorial@gmail.com";
  const cfg = {
    smtpHost: process.env.SMTP_HOST ?? null,
    smtpUser: process.env.SMTP_USER ?? null,
    smtpUserLen: (process.env.SMTP_USER ?? "").length,
    smtpPassLen: (process.env.SMTP_PASS ?? "").length,
    smtpPassHasSpace: /\s/.test(process.env.SMTP_PASS ?? ""),
    mailFrom: process.env.MAIL_FROM ?? null,
    smtpPort: process.env.SMTP_PORT ?? null,
  };
  const r = await sendMailWithPdf({
    to,
    subject: "【本番テスト】川口メモリアルホール メール送信テスト",
    html: "<p>本番環境からのメール送信テストです。届いていれば設定は正常です。</p>",
  });
  return Response.json({ config: cfg, result: r });
}
