"use client";
import { useActionState } from "react";
import Link from "next/link";
import { saveProduct, type KanriResult } from "@/lib/kanri/actions";
import type { Product } from "@/lib/kanri/products";

export function ProductForm({ product, kinds }: { product?: Product; kinds: string[] }) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(saveProduct, null);
  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#1aa39a] focus:outline-none";
  return (
    <form action={action} className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-gray-600">商品種別</label>
          <input name="product_kind" list="kinds" defaultValue={product?.productKind ?? ""} className={inp + " mt-1"} />
          <datalist id="kinds">{kinds.map((k) => <option key={k} value={k} />)}</datalist>
        </div>
        <div>
          <label className="block text-sm text-gray-600">商品名 <span className="text-xs text-red-500">必須</span></label>
          <input name="name" required defaultValue={product?.name ?? ""} className={inp + " mt-1"} />
        </div>
        <div><label className="block text-sm text-gray-600">カナ</label><input name="kana" defaultValue={product?.kana ?? ""} className={inp + " mt-1"} /></div>
        <div><label className="block text-sm text-gray-600">単位</label><input name="unit" defaultValue={product?.unit ?? ""} placeholder="式 / 個 / 名 など" className={inp + " mt-1"} /></div>
        <div><label className="block text-sm text-gray-600">単価（税抜）</label><input name="unit_price" type="number" defaultValue={product?.unitPrice ?? 0} className={inp + " mt-1"} /></div>
        <div><label className="block text-sm text-gray-600">原価</label><input name="cost_price" type="number" defaultValue={product?.costPrice ?? ""} className={inp + " mt-1"} /></div>
        <div>
          <label className="block text-sm text-gray-600">税率</label>
          <select name="tax_rate" defaultValue={String(product?.taxRate ?? 0.1)} className={inp + " mt-1"}>
            <option value="0.1">10%</option>
            <option value="0.08">8%（軽減）</option>
            <option value="0">非課税(0%)</option>
          </select>
        </div>
        <div><label className="block text-sm text-gray-600">発注先</label><input name="supplier" defaultValue={product?.supplier ?? ""} className={inp + " mt-1"} /></div>
      </div>
      <div><label className="block text-sm text-gray-600">備考</label><textarea name="note" rows={2} defaultValue={product?.note ?? ""} className={inp + " mt-1"} /></div>
      <div className="flex gap-3">
        <button disabled={pending} className="rounded bg-[#1aa39a] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : "保存する"}</button>
        <Link href="/kanri/products" className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}
