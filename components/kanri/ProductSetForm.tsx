"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProductSet, type KanriResult } from "@/lib/kanri/actions";
import type { Product, ProductSet } from "@/lib/kanri/products";

// 実スマート葬儀 product_sets/new のフォーム項目に準拠
export function ProductSetForm({ set, products }: { set?: ProductSet; products: Product[] }) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(saveProductSet, null);
  const [exPrice, setExPrice] = useState<string>(set ? String(set.price) : "");
  const [tax, setTax] = useState<number>(set?.tax ?? 0.1);
  const incPrice = exPrice !== "" && !isNaN(Number(exPrice)) ? Math.round(Number(exPrice) * (1 + tax)) : "";
  const initRows = (set?.items ?? []).map((it, i) => ({ key: i, productId: it.productId ?? "", quantity: it.quantity }));
  const [rows, setRows] = useState<{ key: number; productId: string; quantity: number }[]>(initRows.length ? initRows : [{ key: 0, productId: "", quantity: 1 }]);
  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";

  return (
    <form action={action} className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {set && <input type="hidden" name="id" value={set.id} />}

      <F label="セット商品コード"><input name="code" defaultValue={set?.code ?? ""} className={inp} /></F>
      <F label="セット名" required><input name="name" required defaultValue={set?.name ?? ""} className={inp} /></F>
      <F label="詳細説明"><textarea name="description" rows={3} defaultValue={set?.description ?? ""} className={inp} /></F>
      <F label="イメージ"><input type="file" className="text-sm" disabled /><p className="mt-1 text-xs text-gray-400">画像アップロードは後日対応</p></F>

      <div className="grid gap-4 sm:grid-cols-3">
        <F label="セット価格(税抜)"><input name="price" type="number" value={exPrice} onChange={(e) => setExPrice(e.target.value)} className={inp} /></F>
        <F label="セット価格(税込)"><input name="tax_included_price" type="number" value={incPrice} readOnly className={inp + " bg-gray-50"} /></F>
        <F label="消費税率" required>
          <select name="tax" value={String(tax)} onChange={(e) => setTax(Number(e.target.value))} className={inp}>
            <option value="0.1">10%</option>
            <option value="0.08">8%（軽減）</option>
            <option value="0">非課税(0%)</option>
          </select>
        </F>
      </div>

      {/* 内訳 */}
      <div>
        <p className="mb-2 text-sm font-bold text-gray-700">内訳（セットに含まれる商品）</p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <select name="item_product_id" value={r.productId} onChange={(e) => setRows((rs) => rs.map((x) => x.key === r.key ? { ...x, productId: e.target.value } : x))} className={inp + " flex-1"}>
                <option value="">商品を選択</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}（{p.unitPrice.toLocaleString()}円）</option>)}
              </select>
              <input name="item_quantity" type="number" value={r.quantity} onChange={(e) => setRows((rs) => rs.map((x) => x.key === r.key ? { ...x, quantity: Number(e.target.value) || 1 } : x))} className="w-20 rounded border border-gray-300 px-2 py-2 text-sm" />
              {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white">削除</button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: Math.max(0, ...rs.map((x) => x.key)) + 1, productId: "", quantity: 1 }])} className="mt-2 rounded bg-sky-400 px-3 py-1.5 text-xs text-white">＋ 商品を追加</button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="hidden" defaultChecked={set?.hidden} /> 非表示</label>

      <div className="flex gap-3">
        <button disabled={pending} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : "登録する"}</button>
        <Link href="/kanri/product-sets" className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-sm text-gray-600">{label}{required && <span className="ml-1 rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span>}</label><div className="mt-1">{children}</div></div>;
}
