"use client";
import { useState } from "react";
import Link from "next/link";
import { createBulkInvoices } from "@/lib/kanri/actions";
import type { Product } from "@/lib/kanri/products";

interface Hit { id: string; name: string; phone: string; address: string; birth: string }
const ROWS = 30;

export function BulkInvoiceForm({ products }: { products: Product[] }) {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const product = products.find((p) => p.id === productId);

  async function search() {
    setLoading(true);
    try { const res = await fetch(`/kanri/customers/search?q=${encodeURIComponent(q)}`); setHits(await res.json()); }
    finally { setLoading(false); }
  }

  return (
    <form action={createBulkInvoices} className="rounded-lg bg-white p-6 shadow-sm">
      <input type="hidden" name="customer_id" value={customer?.id ?? ""} />
      <input type="hidden" name="product_name" value={product?.name ?? ""} />
      <input type="hidden" name="product_price" value={product?.unitPrice ?? ""} />
      <p className="mb-5 font-bold text-gray-700">登録</p>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-600">顧客 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
          <div className="flex gap-2">
            <input readOnly value={customer?.name ?? ""} placeholder="未選択" className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => { setPickOpen(true); setHits([]); setQ(""); }} className="rounded border border-[#2bb8ae] px-4 py-2 text-sm text-[#2bb8ae]">選択</button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">請求日 <span className="rounded bg-orange-400 px-1.5 py-0.5 text-[10px] text-white">必須</span></label>
          <input type="date" name="billed_on" required className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-500">宛先、金額、数量がすべて入力された行を、一括で請求書登録します。</p>

      <div className="mb-3">
        <p className="mb-1 text-sm text-gray-600">一括適用する商品</p>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-64 rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">未選択</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}（{p.unitPrice.toLocaleString()}円）</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-xs text-gray-500"><tr>{["宛先", "金額", "数量"].map((h) => <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => (
              <tr key={i}>
                <td className="px-2 py-1"><input name="recipient" className="w-full rounded border border-gray-300 px-2 py-1.5" /></td>
                <td className="px-2 py-1"><input name="amount" inputMode="numeric" defaultValue={product ? product.unitPrice : ""} className="w-full rounded border border-gray-300 px-2 py-1.5" /></td>
                <td className="px-2 py-1"><input name="quantity" inputMode="numeric" defaultValue={1} className="w-full rounded border border-gray-300 px-2 py-1.5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex gap-3">
        <button type="submit" disabled={!customer} className="rounded bg-[#5b6ee1] px-6 py-2.5 text-sm text-white disabled:opacity-50">一括登録</button>
        <Link href="/kanri/billing" className="rounded border px-6 py-2.5 text-sm">‹ 戻る</Link>
      </div>

      {pickOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
          <div className="mt-16 w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between"><p className="font-bold text-gray-800">顧客を選択してください。</p><button type="button" onClick={() => setPickOpen(false)} className="text-gray-400">×</button></div>
            <div className="rounded-lg bg-gray-50 p-4">
              <label className="mb-1 block text-xs text-gray-500">キーワード（氏名/カナ/電話/メール/顧客番号）</label>
              <div className="flex gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm" />
                <button type="button" onClick={search} className="rounded bg-[#5b6ee1] px-5 py-2 text-sm text-white">検索</button>
              </div>
            </div>
            <div className="mt-3 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-white text-xs text-gray-500"><tr>{["", "氏名", "電話番号 / 住所", "生年月日"].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {loading ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">検索中…</td></tr> :
                    hits.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">「検索」で顧客を絞り込んでください。</td></tr> :
                      hits.map((h) => (
                        <tr key={h.id}>
                          <td className="px-3 py-2"><button type="button" onClick={() => { setCustomer({ id: h.id, name: h.name }); setPickOpen(false); }} className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">選択</button></td>
                          <td className="px-3 py-2">{h.name}</td>
                          <td className="px-3 py-2 text-gray-500">{[h.phone, h.address].filter(Boolean).join(" / ") || "—"}</td>
                          <td className="px-3 py-2 text-gray-500">{h.birth || "—"}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
