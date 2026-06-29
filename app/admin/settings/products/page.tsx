import Link from "next/link";
import { OFFERING_PRODUCTS } from "@/lib/memorial/products";

export default function ProductsSettings() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">供花・供物の設定・商品登録</h1>
        <button className="rounded bg-[#9b2fae] px-4 py-2 text-sm text-white">＋ 商品を追加（準備中）</button>
      </div>
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{["種別", "商品名", "説明", "金額(税込)", ""].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {OFFERING_PRODUCTS.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">{p.type}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.description}</td>
                <td className="px-4 py-3">{p.priceJpy.toLocaleString()}円</td>
                <td className="px-4 py-3 text-xs text-gray-400">編集（準備中）</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">※ 商品の追加・編集・支払い方法の設定は順次対応します。</p>
    </div>
  );
}
