"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitOrder, type ActionResult } from "@/lib/memorial/actions";
import type { OfferingProduct } from "@/lib/memorial/products";

export function FlowerOrderForm({
  slug,
  products,
}: {
  slug: string;
  products: OfferingProduct[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    submitOrder,
    null
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const product = products.find((p) => p.id === productId);
  const total = product ? product.priceJpy * qty : 0;

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

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />

      {/* 商品選択 */}
      <section>
        <h2 className="mb-3 font-serif text-lg text-[var(--primary)]">ご注文商品</h2>
        <div className="space-y-3">
          {products.map((p) => (
            <label
              key={p.id}
              className={
                "flex cursor-pointer items-center gap-3 rounded border p-3 " +
                (productId === p.id ? "border-[var(--accent)] bg-[var(--card)]" : "border-[var(--border)]")
              }
            >
              <input
                type="radio"
                name="productId"
                value={p.id}
                checked={productId === p.id}
                onChange={() => setProductId(p.id)}
                className="accent-[var(--accent)]"
              />
              <span className="flex-1">
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-[var(--muted)]">{p.description}</span>
              </span>
              <span className="text-sm">{p.priceJpy.toLocaleString()}円<span className="text-xs">（税込）</span></span>
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
      <section className="space-y-5">
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
        <Field label="備考（任意）" name="memo">
          <textarea
            id="memo"
            name="memo"
            rows={3}
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
          />
        </Field>
      </section>

      <div className="space-y-3 text-xs text-[var(--muted)]">
        <p>
          <Link href="/legal/tokushoho" className="text-[var(--accent)] underline">特定商取引法に基づく表記</Link>
          ／
          <Link href="/privacy" className="text-[var(--accent)] underline">プライバシーポリシー</Link>
          をご確認・ご同意のうえ、お進みください。
        </p>
        <p>※ お支払い（オンラインカード決済）は次の確認画面でご入力いただきます（準備中）。</p>
      </div>

      {err._form && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err._form}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "送信中…" : "入力内容を確認する"}
      </button>
    </form>
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
