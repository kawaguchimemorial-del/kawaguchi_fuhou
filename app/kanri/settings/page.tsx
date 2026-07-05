import Link from "next/link";
import { MASTER_TYPES, masterCounts } from "@/lib/kanri/masters";
import { listProducts } from "@/lib/kanri/products";

export const metadata = { title: "設定（マスタ）" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [counts, products] = await Promise.all([masterCounts(), listProducts()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">設定（マスタ）</h1>
      <p className="text-sm text-gray-500">見積・請求・発注で使う基本情報を登録します。</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/kanri/products" className="rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
          <p className="font-medium text-[#9b2fae]">商品</p>
          <p className="mt-1 text-xs text-gray-500">{products.length} 件 — 単価・税率・種別を登録</p>
        </Link>
        {MASTER_TYPES.map((m) => (
          <Link key={m.type} href={`/kanri/settings/${m.type}`} className="rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
            <p className="font-medium text-[#9b2fae]">{m.label}</p>
            <p className="mt-1 text-xs text-gray-500">{counts[m.type] ?? 0} 件</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
