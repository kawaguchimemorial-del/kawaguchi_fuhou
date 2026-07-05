import Link from "next/link";
import { MASTER_TYPES, MASTER_CATEGORIES, masterCounts } from "@/lib/kanri/masters";
import { listProducts } from "@/lib/kanri/products";

export const metadata = { title: "設定（マスタ）" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [counts, products] = await Promise.all([masterCounts(), listProducts()]);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定（マスタ）</h1>
      <p className="text-sm text-gray-500">見積・請求・発注で使う基本情報を登録します。スマート葬儀に準拠した各種マスタを細分化して管理できます。</p>

      {/* 特別: 会社情報 / 商品 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/kanri/settings/company" className="rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
          <p className="font-medium text-[#9b2fae]">会社情報</p>
          <p className="mt-1 text-xs text-gray-500">葬儀会社名・住所・口座・インボイス等</p>
        </Link>
        <Link href="/kanri/products" className="rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
          <p className="font-medium text-[#9b2fae]">商品</p>
          <p className="mt-1 text-xs text-gray-500">{products.length} 件 — 単価・税率・種別</p>
        </Link>
      </div>

      {MASTER_CATEGORIES.map((cat) => (
        <div key={cat}>
          <h2 className="mb-2 border-l-4 border-[#9b2fae] pl-2 text-sm font-bold text-gray-700">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MASTER_TYPES.filter((m) => m.category === cat).map((m) => (
              <Link key={m.type} href={`/kanri/settings/${m.type}`} className="rounded-lg bg-white p-3 shadow-sm hover:bg-gray-50">
                <p className="text-sm font-medium text-[#9b2fae]">{m.label}</p>
                <p className="mt-1 text-xs text-gray-400">{counts[m.type] ?? 0} 件</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
