// オンライン供花 注文メールの文言テンプレート(10専門家仕様: 段落スロット方式)。
// - 既定値はここが唯一の真実源。設定(fk_master_items app_setting)が空/不正なら必ずこれに戻る。
// - 差し込み変数は {{会社名}} {{TEL}} の2つのみ。スロットはプレーンテキスト(改行→<br>変換)。
export const ORDER_MAIL_KEYS = ["subject", "greeting", "pay_onsite", "pay_invoice", "pay_pending", "footer_note"] as const;
export type OrderMailKey = (typeof ORDER_MAIL_KEYS)[number];

export const ORDER_MAIL_DEFAULTS: Record<OrderMailKey, string> = {
  subject: "【{{会社名}}】供花・供物ご注文ありがとうございます",
  greeting: "この度は供花・供物のご注文をいただき、誠にありがとうございます。以下の内容で承りました。",
  pay_onsite: "当日、会場にてお支払いをお願いいたします。",
  pay_invoice: "お支払いは、下記より請求書を開いて印刷のうえ、記載の方法にてお願いいたします。",
  pay_pending: "後ほど請求書のご案内をお送りいたします。",
  footer_note: "※ このメールは送信専用アドレスから配信しています。ご返信いただいてもお受けできません。\nご不明な点・ご変更・キャンセル等は、お手数ですがお電話（{{TEL}}）にてお問い合わせください。",
};

export const ORDER_MAIL_LABELS: Record<OrderMailKey, string> = {
  subject: "件名",
  greeting: "冒頭あいさつ",
  pay_onsite: "支払い案内（当日現地払い）",
  pay_invoice: "支払い案内（請求書払い・リンクの上に表示）",
  pay_pending: "支払い案内（請求書未作成時）",
  footer_note: "末尾の注記（送信専用・問い合わせ案内）",
};

export const ORDER_NOTIFY_DEFAULT_TO = "flower@kawaguchi-memorial-hall.com";
export const ALLOWED_VARS = ["{{会社名}}", "{{TEL}}"] as const;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// スロット値を解決: 空→既定値。変数置換後に {{ が残れば既定値へフォールバック(送信は止めない)。
export function fillSlot(key: OrderMailKey, raw: string | undefined, vars: { company: string; tel: string }, opts?: { html?: boolean }): string {
  const substitute = (t: string) => t.replaceAll("{{会社名}}", vars.company).replaceAll("{{TEL}}", vars.tel || "—");
  const def = substitute(ORDER_MAIL_DEFAULTS[key]);
  const src = (raw ?? "").trim();
  if (!src) return opts?.html ? def.replace(/\n/g, "<br>") : def;
  const filled = substitute(src);
  if (filled.includes("{{")) {
    console.error(`[order-mail] スロット${key}に未定義変数が残存。既定値にフォールバック:`, filled.slice(0, 80));
    return opts?.html ? def.replace(/\n/g, "<br>") : def;
  }
  const out = opts?.html ? escapeHtml(filled).replace(/\n/g, "<br>") : filled;
  return out;
}

// 保存前検証: ホワイトリスト外の {{...}} を含む場合エラー文字列を返す(タイポ検出)。
export function validateSlots(slots: Record<string, string>): string | null {
  for (const [k, v] of Object.entries(slots)) {
    const tokens = v.match(/\{\{[^}]*\}\}/g) ?? [];
    for (const t of tokens) {
      if (!(ALLOWED_VARS as readonly string[]).includes(t)) {
        return `「${k}」に使用できない変数 ${t} が含まれています（使用可能: ${ALLOWED_VARS.join(" ")}）。`;
      }
    }
  }
  return null;
}
