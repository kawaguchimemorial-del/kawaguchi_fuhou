"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// publishableキーは公開前提(NEXT_PUBLIC_)。1度だけロードする。
let _p: Promise<Stripe | null> | null = null;
function stripePromise(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  if (!_p) _p = loadStripe(key);
  return _p;
}

export function KodenPaymentStep({
  slug, clientSecret, amount, chargedAmount, feePayer,
}: { slug: string; clientSecret: string; amount: number; chargedAmount: number; feePayer: string }) {
  const promise = stripePromise();
  if (!promise) {
    return <p className="rounded bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">決済の初期化に失敗しました（公開鍵が未設定です）。</p>;
  }
  return (
    <div className="space-y-5">
      <div className="rounded bg-[var(--card)] px-4 py-3 text-sm">
        <div className="flex justify-between"><span className="text-[var(--muted)]">お香典</span><span className="font-medium">{amount.toLocaleString()}円</span></div>
        {feePayer === "sender" && (
          <div className="mt-1 flex justify-between text-xs text-[var(--muted)]"><span>決済手数料（ご負担分）</span><span>+{(chargedAmount - amount).toLocaleString()}円</span></div>
        )}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>お支払い額</span><span>{chargedAmount.toLocaleString()}円</span></div>
      </div>
      <Elements stripe={promise} options={{ clientSecret, appearance: { theme: "flat" }, locale: "ja" }}>
        <InnerForm slug={slug} />
      </Elements>
    </div>
  );
}

function InnerForm({ slug }: { slug: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/m/${slug}/koden/complete` },
    });
    // ここに戻るのはエラー時のみ（成功時は return_url へリダイレクト）。
    if (error) { setErr(error.message ?? "決済に失敗しました。"); setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PaymentElement />
      {err && <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err}</p>}
      <button type="submit" disabled={!stripe || busy} className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white hover:bg-[var(--accent-strong)] disabled:opacity-60">
        {busy ? "処理中…" : "この内容でお支払い"}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">お支払いはStripeにより安全に処理されます。</p>
    </form>
  );
}
