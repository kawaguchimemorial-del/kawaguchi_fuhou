"use client";

import { useActionState } from "react";
import { saveNotifyAction } from "@/lib/mourner/actions";
import type { ActionState } from "@/lib/mourner/types";

export function MailSettingsForm({
  memorialId,
  email,
  receipt,
  koden,
}: {
  memorialId: string;
  email: string | null;
  receipt: boolean;
  koden: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNotifyAction, {});

  return (
    <form action={action} className="rounded-lg bg-white p-5 shadow-sm">
      <input type="hidden" name="memorialId" value={memorialId} />

      {state.error && <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}

      <h2 className="mb-2 font-bold">現在登録されているメールアドレス</h2>
      <p className="mb-5 text-sm text-[#6b6b6b]">
        {email || "登録されているメールアドレスはありません。"}
      </p>

      <label htmlFor="email" className="block text-sm text-[#6b6b6b]">
        メールアドレスを登録/変更
      </label>
      <input
        id="email"
        name="email"
        type="email"
        defaultValue={email ?? ""}
        placeholder="user@example.com"
        autoComplete="email"
        className="mb-6 w-full border-b border-[#ddd] py-2.5 text-base focus:border-[#1b2a4a] focus:outline-none"
      />

      <h2 className="mb-1 font-bold">通知設定</h2>
      <p className="mb-3 text-sm text-[#6b6b6b]">
        チェックを入れたメールが、登録されたメールアドレス宛に通知されます。
      </p>

      <label className="mb-3 flex gap-3">
        <input type="checkbox" name="receipt" defaultChecked={receipt} className="mt-1 h-5 w-5 shrink-0" />
        <span>
          <span className="block font-medium">ご記帳の通知</span>
          <span className="block text-sm text-[#6b6b6b]">オンライン式場より、ご記帳があった場合に通知します。</span>
        </span>
      </label>

      <label className="mb-6 flex gap-3">
        <input type="checkbox" name="incense" defaultChecked={koden} className="mt-1 h-5 w-5 shrink-0" />
        <span>
          <span className="block font-medium">香典決済の通知</span>
          <span className="block text-sm text-[#6b6b6b]">オンラインカード決済によるお香典のお渡しがあった場合に通知します。</span>
        </span>
      </label>

      <button type="submit" disabled={pending}
              className="rounded bg-[#1b2a4a] px-6 py-3 text-sm text-white disabled:opacity-60">
        {pending ? "保存中…" : "保存する"}
      </button>
    </form>
  );
}
