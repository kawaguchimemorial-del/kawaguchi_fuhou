"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createKodenPayment, type KodenStart } from "@/lib/memorial/actions";
import { KodenPaymentStep } from "./KodenPaymentStep";

const PRESETS = [3000, 5000, 10000, 30000, 50000];

export function KodenForm({
  slug,
  hyogaki,
}: {
  slug: string;
  hyogaki: string;
}) {
  const [state, action, pending] = useActionState<KodenStart | null, FormData>(
    createKodenPayment,
    null
  );
  const [amount, setAmount] = useState(5000);

  // Stripe決済へ（clientSecret取得済み）→ Payment Element を表示
  if (state?.ok && state.stripe) {
    return (
      <KodenPaymentStep slug={slug} clientSecret={state.clientSecret} amount={state.amount} chargedAmount={state.chargedAmount} feePayer={state.feePayer} />
    );
  }
  // Stripe未設定時のフォールバック（従来の「準備中」表示）
  if (state?.ok && !state.stripe) {
    return (
      <div className="rounded-md bg-[var(--card)] px-6 py-10 text-center">
        <p className="font-serif text-lg text-[var(--primary)]">{state.message}</p>
        <Link href={`/m/${slug}`} className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]">
          訃報ページへ戻る
        </Link>
      </div>
    );
  }
  const err = state?.ok === false ? state.errors : {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="amount" value={amount} />

      <div className="rounded bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
        表書き：<span className="font-medium text-[var(--foreground)]">{hyogaki}</span>
      </div>

      <div>
        <p className="text-sm text-[var(--muted)]">金額をお選びください</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setAmount(p)}
              className={
                "rounded border py-3 text-sm " +
                (amount === p ? "border-[var(--accent)] bg-[var(--card)] font-medium" : "border-[var(--border)]")
              }
            >
              {p.toLocaleString()}円
            </button>
          ))}
        </div>
        {err.amount && <p className="mt-1 text-sm text-[var(--danger)]">{err.amount}</p>}
        <p className="mt-2 text-xs text-[var(--muted)]">
          ご関係に応じた目安：友人・知人 5,000円／親族 10,000〜30,000円
        </p>
      </div>

      <Field label="ご芳名（記帳されるお名前）" name="donorName" error={err.donorName} required>
        <input id="donorName" name="donorName" className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none" />
      </Field>
      <Field label="法人・団体名（任意）" name="donorCompany">
        <input id="donorCompany" name="donorCompany" className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none" />
      </Field>

      <div>
        <p className="text-sm text-[var(--muted)]">決済手数料のご負担</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="radio" name="feePayer" value="recipient" defaultChecked className="accent-[var(--accent)]" />
          ご遺族が負担（通常）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="feePayer" value="sender" className="accent-[var(--accent)]" />
          手数料を負担して全額をご遺族へ届ける
        </label>
      </div>

      <Field label="ひとこと（任意）" name="message">
        <textarea id="message" name="message" rows={3} maxLength={200} className="mt-1 w-full rounded border p-3 focus:border-[var(--accent)] focus:outline-none" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAmountPublic" value="on" className="h-4 w-4 accent-[var(--accent)]" />
        芳名録に金額を公開してもよい
      </label>

      <p className="text-xs text-[var(--muted)]">
        ※ 次の画面でカード情報をご入力いただきます。お香典は喪主さまへお届けします。
      </p>
      {err._form && <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err._form}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white hover:bg-[var(--accent-strong)] disabled:opacity-60">
        {pending ? "処理中…" : "お支払いへ進む"}
      </button>
    </form>
  );
}

function Field({ label, name, error, required, children }: { label: string; name: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-[var(--muted)]">
        {label}{required && <span className="ml-1 text-[var(--danger)]">必須</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
