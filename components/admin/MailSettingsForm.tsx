"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOrderMailSettings } from "@/lib/admin/mail-settings-actions";
import { ORDER_MAIL_KEYS, ORDER_MAIL_LABELS, type OrderMailKey } from "@/lib/memorial/mail-template";

// メール設定フォーム。現在の実文言(既定値 or 保存済み)を表示し、編集・保存すると実際の送信文言が変わる。
export function MailSettingsForm({
  notifyTo,
  defaults,
  saved,
  sample,
}: {
  notifyTo: string;                          // 現在有効な通知先
  defaults: Record<OrderMailKey, string>;    // コード既定値(変数未置換)
  saved: Record<string, string>;             // 保存済みスロット(空=既定値運用)
  sample: { company: string; tel: string };  // プレビュー用の実会社情報
}) {
  const router = useRouter();
  const [to, setTo] = useState(notifyTo);
  const [slots, setSlots] = useState<Record<OrderMailKey, string>>(() => {
    const o = {} as Record<OrderMailKey, string>;
    for (const k of ORDER_MAIL_KEYS) o[k] = (saved[k] ?? "").trim() || defaults[k];
    return o;
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const substitute = (t: string) => t.replaceAll("{{会社名}}", sample.company).replaceAll("{{TEL}}", sample.tel || "—");
  const preview = useMemo(() => ({
    subject: substitute(slots.subject),
    body: [
      "山田 花子 様", "",
      substitute(slots.greeting), "",
      "商品：洋花A　数量：1　札名：株式会社〇〇　合計：23,100円（税込）", "",
      "【請求書払いの場合】" , substitute(slots.pay_invoice), "▶ 請求書を表示・印刷する（リンク）", "",
      "【当日現地払いの場合】", substitute(slots.pay_onsite), "",
      substitute(slots.footer_note), "",
      "――――――――――", sample.company, sample.tel ? `TEL: ${sample.tel}` : "",
    ].join("\n"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [slots, sample]);

  function save() {
    setMsg(null);
    start(async () => {
      // 既定値と同一のスロットは空で保存(=既定値運用。コード側の文言改善に自動追従)
      const out: Record<string, string> = {};
      for (const k of ORDER_MAIL_KEYS) out[k] = slots[k] === defaults[k] ? "" : slots[k];
      const r = await saveOrderMailSettings({ notifyTo: to, slots: out });
      if (r.ok) { setMsg("保存しました。次回の注文メールから反映されます。"); router.refresh(); }
      else setMsg(`保存に失敗しました：${r.error ?? ""}`);
    });
  }

  const inp = "w-full rounded border border-gray-300 p-3 text-sm focus:border-[#9b2fae] focus:outline-none";
  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <p className="mb-1 font-medium">注文メール通知先</p>
        <p className="mb-3 text-sm text-gray-500">供花・供物の注文が入った際、葬儀社側に通知するメールアドレス。</p>
        <input value={to} onChange={(e) => setTo(e.target.value)} className={inp} placeholder="flower@kawaguchi-memorial-hall.com" />
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <p className="mb-1 font-medium">自動送信メール文言（注文者への確認メール）</p>
        <p className="mb-4 text-sm text-gray-500">
          現在使用中の文言を表示しています。編集して保存すると、実際に送信されるメールに反映されます。<br />
          使用できる変数：<code className="rounded bg-gray-100 px-1">{"{{会社名}}"}</code> <code className="rounded bg-gray-100 px-1">{"{{TEL}}"}</code>（会社情報から自動で差し込まれます）
        </p>
        <div className="space-y-4">
          {ORDER_MAIL_KEYS.map((k) => (
            <label key={k} className="block">
              <span className="text-sm text-gray-600">{ORDER_MAIL_LABELS[k]}</span>
              {k === "subject" ? (
                <input value={slots[k]} onChange={(e) => setSlots((s) => ({ ...s, [k]: e.target.value }))} className={inp + " mt-1"} />
              ) : (
                <textarea value={slots[k]} onChange={(e) => setSlots((s) => ({ ...s, [k]: e.target.value }))} rows={k === "footer_note" ? 3 : 2} className={inp + " mt-1"} />
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <p className="mb-2 font-medium">プレビュー（サンプルデータで表示）</p>
        <p className="mb-1 text-sm"><span className="text-gray-500">件名：</span>{preview.subject}</p>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">{preview.body}</pre>
      </section>

      {msg && <p className={`rounded px-4 py-2 text-sm ${msg.startsWith("保存しました") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{msg}</p>}
      <button onClick={save} disabled={pending} className="rounded bg-[#9b2fae] px-8 py-2.5 text-sm text-white disabled:opacity-50">{pending ? "保存中…" : "保存する"}</button>
    </div>
  );
}
