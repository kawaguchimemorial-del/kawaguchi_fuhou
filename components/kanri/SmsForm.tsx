"use client";
import { useActionState } from "react";
import { sendSms, type KanriResult } from "@/lib/kanri/actions";

export function SmsForm() {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(sendSms, null);
  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#9b2fae] focus:outline-none";
  return (
    <form action={action} className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      <div>
        <label className="block text-sm text-gray-600">送信先電話番号 <span className="text-xs text-red-500">必須</span></label>
        <input name="phone" required placeholder="09012345678" className={inp + " mt-1 max-w-xs"} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">本文 <span className="text-xs text-red-500">必須</span></label>
        <textarea name="body" required rows={4} maxLength={660} className={inp + " mt-1"} placeholder="メッセージを入力" />
      </div>
      <button disabled={pending} className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "送信中…" : "送信する"}</button>
      <p className="text-xs text-gray-400">※ 送信ログを記録します（実際のSMS配信は配信事業者連携時に有効化）。</p>
    </form>
  );
}
