"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitOrder, type ActionResult } from "@/lib/memorial/actions";
import type { OfferingProduct } from "@/lib/memorial/products";

export function FlowerOrderForm({
  slug,
  products,
  acceptInvoice = true,
  acceptOnsite = true,
}: {
  slug: string;
  products: OfferingProduct[];
  acceptInvoice?: boolean;
  acceptOnsite?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    submitOrder,
    null
  );
  const payOptions = [
    ...(acceptInvoice ? ["請求書払い（銀行振込）"] : []),
    ...(acceptOnsite ? ["当日現地払い"] : []),
  ];
  const [payMethod, setPayMethod] = useState(payOptions[0] ?? "請求書払い（銀行振込）");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<"input" | "confirm">("input");
  const [review, setReview] = useState<Record<string, string>>({});
  const [cerr, setCerr] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  // 拡大表示（ライトボックス）対象の画像。null で非表示。
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const product = products.find((p) => p.id === productId);
  const total = product ? product.priceJpy * qty : 0;

  // 拡大表示中は Esc で閉じる
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  if (state?.ok) {
    return (
      <div className="rounded-md bg-[var(--card)] px-6 py-10 text-center">
        <p className="font-serif text-lg text-[var(--primary)]">ご注文を承りました</p>
        <p className="mt-3 text-sm text-[var(--muted)]">{state.message}</p>
        <Link
          href={`/m/${slug}`}
          className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]"
        >
          訃報ページへ戻る
        </Link>
      </div>
    );
  }
  const err = state?.ok === false ? state.errors : {};

  function goConfirm() {
    const el = formRef.current;
    if (!el) return;
    const fd = new FormData(el);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    const e: Record<string, string> = {};
    if (!g("productId")) e.productId = "商品をお選びください";
    const q = Number(g("quantity"));
    if (!(q >= 1 && q <= 20)) e.quantity = "数量は1〜20でご入力ください";
    if (!g("ordererName")) e.ordererName = "お名前をご入力ください";
    if (!g("ordererKana")) e.ordererKana = "フリガナをご入力ください";
    if (!/^\d{7}$/.test(g("postalCode"))) e.postalCode = "郵便番号は7桁（ハイフン不要）";
    if (!g("address")) e.address = "住所をご入力ください";
    if (!/^\d{10,11}$/.test(g("phone"))) e.phone = "電話番号は10〜11桁の数字";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email"))) e.email = "メールアドレスの形式が正しくありません";
    if (g("email") !== g("emailConfirm")) e.emailConfirm = "確認用メールアドレスが一致しません";
    if (!g("namePlateText")) e.namePlateText = "札名をご入力ください";
    if (payOptions.length > 0 && !g("paymentMethod")) e.paymentMethod = "お支払い方法をお選びください";
    setCerr(e);
    if (Object.keys(e).length > 0) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const obj: Record<string, string> = {};
    fd.forEach((v, k) => { obj[k] = String(v); });
    setReview(obj);
    setPhase("confirm");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const hideInput = phase === "confirm" ? { display: "none" } : undefined;
  const reviewProduct = products.find((p) => p.id === review.productId);

  return (
    <>
    <form ref={formRef} action={action} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />
      {phase === "input" && Object.keys(cerr).length > 0 && (
        <div className="rounded bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
          <p className="mb-1 font-medium">入力内容をご確認ください：</p>
          <ul className="list-disc pl-5">{Object.values(cerr).map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      {/* 商品選択 */}
      <section style={hideInput}>
        <h2 className="mb-3 font-serif text-lg text-[var(--primary)]">ご注文商品</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">画像をタップ／クリックすると拡大表示できます。</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <label
              key={p.id}
              className={
                "flex cursor-pointer flex-col overflow-hidden rounded border " +
                (productId === p.id ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]")
              }
            >
              {/* 画像（クリック/タップで拡大。ラジオ選択とは独立） */}
              <div className="relative bg-[var(--card)]">
                {p.imagePath ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setZoom({ src: p.imagePath!, alt: p.name });
                    }}
                    className="block w-full cursor-zoom-in"
                    aria-label={`${p.name}の画像を拡大表示`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imagePath}
                      alt={p.name}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                    />
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                      タップで拡大
                    </span>
                  </button>
                ) : (
                  <span className="flex h-44 w-full items-center justify-center text-xs text-[var(--muted)]">
                    画像準備中
                  </span>
                )}
              </div>

              {/* 商品情報＋選択 */}
              <div className="flex flex-1 items-start gap-2 p-3">
                <input
                  type="radio"
                  name="productId"
                  value={p.id}
                  checked={productId === p.id}
                  onChange={() => setProductId(p.id)}
                  className="mt-1 flex-none accent-[var(--accent)]"
                />
                <span className="flex-1">
                  <span className="font-medium">{p.name}</span>
                  {p.description && (
                    <span className="block text-xs text-[var(--muted)]">{p.description}</span>
                  )}
                  <span className="mt-1 block text-sm">
                    {p.priceJpy.toLocaleString()}円<span className="text-xs">（税込）</span>
                  </span>
                </span>
              </div>
            </label>
          ))}
        </div>
        {err.productId && <p className="mt-1 text-sm text-[var(--danger)]">{err.productId}</p>}

        <div className="mt-4 flex items-center justify-between">
          <label htmlFor="quantity" className="text-sm text-[var(--muted)]">数量</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={20}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-20 rounded border border-[var(--border)] px-3 py-2 text-right"
          />
        </div>
        <p className="mt-3 text-right font-medium">
          合計：{total.toLocaleString()}円（税込）
        </p>
      </section>

      {/* 注文者情報 */}
      <section className="space-y-5" style={hideInput}>
        <h2 className="font-serif text-lg text-[var(--primary)]">ご注文者様の情報</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="姓" name="ordererName" error={err.ordererName} required>
            <Input name="ordererName" autoComplete="family-name" />
          </Field>
          <Field label="セイ（フリガナ）" name="ordererKana" error={err.ordererKana} required>
            <Input name="ordererKana" />
          </Field>
        </div>
        <Field label="法人・団体名（任意）" name="company">
          <Input name="company" />
        </Field>
        <Field label="郵便番号（ハイフン不要）" name="postalCode" error={err.postalCode} required>
          <Input name="postalCode" inputMode="numeric" placeholder="3330833" />
        </Field>
        <Field label="住所" name="address" error={err.address} required>
          <Input name="address" autoComplete="street-address" />
        </Field>
        <Field label="電話番号" name="phone" error={err.phone} required>
          <Input name="phone" inputMode="tel" placeholder="09012345678" />
        </Field>
        <Field label="メールアドレス" name="email" error={err.email} required>
          <Input name="email" type="email" autoComplete="email" />
        </Field>
        <Field label="メールアドレス（確認）" name="emailConfirm" error={err.emailConfirm} required>
          <Input name="emailConfirm" type="email" />
        </Field>

        <Field label="札名（立札のお名前）" name="namePlateText" error={err.namePlateText} required>
          <textarea
            id="namePlateText"
            name="namePlateText"
            rows={2}
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
            placeholder="例：株式会社〇〇 代表取締役 青空 太郎"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="oldChar" value="on" className="h-4 w-4 accent-[var(--accent)]" />
          札名に旧字体（変換で出ない漢字）を希望する
        </label>

        <Field label="請求書・領収書宛名（任意）" name="invoiceName">
          <Input name="invoiceName" />
        </Field>
        {payOptions.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-[var(--primary)]">お支払い方法</p>
            <div className="flex flex-col gap-2">
              {payOptions.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="paymentMethod" value={m} checked={payMethod === m} onChange={() => setPayMethod(m)} className="h-4 w-4 accent-[var(--accent)]" />
                  {m}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{payMethod === "当日現地払い" ? "当日、会場にてお支払いください。" : "ご注文確認メールに記載の請求書リンクを開き、印刷してお支払いください。"}</p>
          </div>
        )}

        <Field label="備考（任意）" name="memo">
          <textarea
            id="memo"
            name="memo"
            rows={3}
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
          />
        </Field>
      </section>

      <div className="space-y-3 text-xs text-[var(--muted)]" style={hideInput}>
        <p>
          <Link href="/legal/tokushoho" className="text-[var(--accent)] underline">特定商取引法に基づく表記</Link>
          ／
          <Link href="/privacy" className="text-[var(--accent)] underline">プライバシーポリシー</Link>
          をご確認・ご同意のうえ、お進みください。
        </p>
      </div>

      {err._form && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err._form}</p>
      )}

      {/* 注文確認 */}
      {phase === "confirm" && (
        <section className="rounded border border-[var(--accent)] bg-[var(--card)] p-5">
          <h2 className="mb-3 font-serif text-lg text-[var(--primary)]">ご注文内容の確認</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">以下の内容でよろしければ「この内容で注文する」を押してください。</p>
          <dl className="space-y-2 text-sm">
            {[
              ["ご注文商品", reviewProduct ? `${reviewProduct.name}（${reviewProduct.priceJpy.toLocaleString()}円）` : review.productId],
              ["数量", review.quantity],
              ["合計金額", reviewProduct ? `${(reviewProduct.priceJpy * Number(review.quantity || 1)).toLocaleString()}円（税込）` : ""],
              ["お名前", `${review.ordererName ?? ""} 様${review.ordererKana ? `（${review.ordererKana}）` : ""}`],
              ["法人・団体名", review.company || "—"],
              ["ご住所", `〒${review.postalCode ?? ""} ${review.address ?? ""}`],
              ["電話番号", review.phone],
              ["メールアドレス", review.email],
              ["札名", review.namePlateText],
              ["旧字体希望", review.oldChar === "on" ? "希望する" : "—"],
              ["お支払い方法", review.paymentMethod || "—"],
              ["請求書・領収書宛名", review.invoiceName || "—"],
              ["備考", review.memo || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-[var(--border)] pb-2">
                <dt className="w-32 flex-none text-[var(--muted)]">{k}</dt>
                <dd className="flex-1 whitespace-pre-wrap break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {phase === "input" ? (
        <button
          type="button"
          onClick={goConfirm}
          className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)]"
        >
          入力内容を確認する
        </button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {pending ? "送信中…" : "この内容で注文する"}
          </button>
          <button
            type="button"
            onClick={() => { setPhase("input"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-full rounded-sm border border-[var(--border)] py-3.5 text-[var(--primary)] sm:w-48"
          >
            修正する
          </button>
        </div>
      )}
    </form>

    {/* 画像拡大ライトボックス（背景／✕／元画像クリックで閉じる） */}
    {zoom && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${zoom.alt} 拡大画像`}
        onClick={() => setZoom(null)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        <button
          type="button"
          onClick={() => setZoom(null)}
          aria-label="閉じる"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-2xl leading-none text-black shadow"
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={zoom.src}
          alt={zoom.alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-full rounded object-contain shadow-2xl"
        />
        <p className="absolute bottom-5 left-0 right-0 text-center text-sm text-white/90">
          {zoom.alt}　／　画面をタップで閉じる
        </p>
      </div>
    )}
    </>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <input
      id={props.name}
      {...props}
      className="mt-1 w-full border-b border-[var(--border)] bg-transparent py-2 focus:border-[var(--accent)] focus:outline-none"
    />
  );
}

function Field({
  label,
  name,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-[var(--muted)]">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]">必須</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
