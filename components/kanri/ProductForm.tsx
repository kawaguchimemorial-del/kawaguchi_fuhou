"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { saveProduct, type KanriResult } from "@/lib/kanri/actions";
import type { Product } from "@/lib/kanri/products";

// 実スマート葬儀 /users/products/new のフォーム項目に準拠
export function ProductForm({ product, kinds, suppliers }: { product?: Product; kinds: string[]; suppliers?: string[] }) {
  const [state, action, pending] = useActionState<KanriResult | null, FormData>(saveProduct, null);
  const [exPrice, setExPrice] = useState<string>(String(product?.unitPrice ?? ""));
  const [taxRate, setTaxRate] = useState<number>(product?.taxRate ?? 0.1);
  const incPrice = exPrice !== "" && !isNaN(Number(exPrice)) ? Math.round(Number(exPrice) * (1 + taxRate)) : "";
  const inp = "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";

  return (
    <form action={action} className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
      {state && state.ok === false && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{state.error}</p>}
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <F label="発注先">
          <select name="supplier" defaultValue={product?.supplier ?? ""} className={inp}>
            <option value="">選択してください</option>
            {(suppliers ?? []).map((sp) => <option key={sp} value={sp}>{sp}</option>)}
          </select>
        </F>
        <F label="商品種別">
          <input name="product_kind" list="kinds" defaultValue={product?.productKind ?? ""} className={inp} />
          <datalist id="kinds">{kinds.map((k) => <option key={k} value={k} />)}</datalist>
        </F>
        <F label="商品コード"><input name="product_code" defaultValue={product?.productCode ?? ""} className={inp} /></F>
        <F label="商品名" required><input name="name" required defaultValue={product?.name ?? ""} className={inp} /></F>
        <F label="型番"><input name="model_code" defaultValue={product?.modelCode ?? ""} className={inp} /></F>
        <F label="単位"><input name="unit" defaultValue={product?.unit ?? ""} placeholder="式 / 個 / 名 など" className={inp} /></F>
        <F label="価格(税抜)"><input name="unit_price" type="number" value={exPrice} onChange={(e) => setExPrice(e.target.value)} className={inp} /></F>
        <F label="価格(税込)"><input type="number" value={incPrice} readOnly className={inp + " bg-gray-50"} /></F>
        <F label="税率" required>
          <select name="tax_rate" value={String(taxRate)} onChange={(e) => setTaxRate(Number(e.target.value))} className={inp}>
            <option value="0.1">10%</option>
            <option value="0.08">8%（軽減）</option>
            <option value="0">非課税(0%)</option>
          </select>
        </F>
        <F label="立替金"><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="refundable" defaultChecked={product?.refundable} /> 立替金として扱う</label></F>
        <F label="下代(税抜)" required><input name="cost_price" type="number" defaultValue={product?.costPrice ?? 0} className={inp} /></F>
        <F label="下代用税率">
          <select name="cost_tax" defaultValue={String(product?.costTax ?? 0.1)} className={inp}>
            <option value="0.1">10%</option>
            <option value="0.08">8%（軽減）</option>
            <option value="0">非課税(0%)</option>
          </select>
        </F>
        <F label="非適格事業者用控除">
          <select name="deduction" defaultValue={product?.deduction ?? ""} className={inp}>
            <option value="">なし</option>
            <option value="控除80">控除80</option>
            <option value="控除50">控除50</option>
          </select>
        </F>
      </div>

      <F label="商品説明"><textarea name="description" rows={3} defaultValue={product?.description ?? ""} className={inp} /></F>

      <div className="grid gap-2 sm:grid-cols-2">
        <Check name="available_ec" label="ECに表示する" checked={product?.availableEc} />
        <Check name="available_homepage" label="ホームページ内販売に表示する" checked={product?.availableHomepage} />
        <Check name="available_attendant" label="参列者のECに表示する" checked={product?.availableAttendant} />
        <Check name="available_returned_item" label="返礼品のECに表示する" checked={product?.availableReturnedItem} />
        <Check name="available_item" label="一般販売品のECに表示する" checked={product?.availableItem} />
        <Check name="grouped" label="グループ商品として登録" checked={product?.grouped} />
        <Check name="not_ordering" label="発注しない" checked={product?.notOrdering} />
        <Check name="order_only" label="発注のみに利用する" checked={product?.orderOnly} />
      </div>

      <F label="補足説明"><textarea name="remarks" rows={2} defaultValue={product?.remarks ?? ""} className={inp} /></F>

      <div className="grid gap-2 sm:grid-cols-2">
        <Check name="hidden_picking" label="ピッキングリストに非表示" checked={product?.hiddenPicking} />
        <Check name="hidden" label="非表示" checked={product?.hidden} />
      </div>

      <div className="flex gap-3">
        <button disabled={pending} className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white disabled:opacity-60">{pending ? "保存中…" : "登録する"}</button>
        <Link href="/kanri/products" className="rounded border px-6 py-2.5 text-sm">キャンセル</Link>
      </div>
    </form>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-sm text-gray-600">{label}{required && <span className="ml-1 rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span>}</label><div className="mt-1">{children}</div></div>;
}
function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name={name} defaultChecked={checked} /> {label}</label>;
}
