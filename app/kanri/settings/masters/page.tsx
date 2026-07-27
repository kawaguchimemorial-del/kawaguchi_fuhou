import { MASTER_TYPES, MASTER_CATEGORIES, masterCounts } from "@/lib/kanri/masters";
import { listProducts } from "@/lib/kanri/products";
import { MasterHub, type MasterItem } from "@/components/kanri/MasterHub";

export const metadata = { title: "設定（マスタ）" };
export const dynamic = "force-dynamic";

// マスタ以外の特別な設定画面。カテゴリ「基本設定」として先頭に置く。
const BASIC = "基本設定";

export default async function SettingsPage() {
  const [counts, products] = await Promise.all([masterCounts(), listProducts()]);

  const items: MasterItem[] = [
    { href: "/kanri/settings/company", label: "会社情報", hint: "葬儀会社名・住所・口座・インボイス等", category: BASIC },
    { href: "/kanri/products", label: "商品", count: products.length, hint: "単価・税率・種別", category: BASIC },
    { href: "/kanri/settings/service-fee", label: "サービス利用料", hint: "商品種別ごとの利用料率", category: BASIC },
    { href: "/kanri/settings/field-visibility", label: "項目の表示、非表示設定", hint: "顧客/葬家/請求書の項目表示", category: BASIC },
    { href: "/kanri/settings/required-fields", label: "CRM入力必須項目設定", hint: "入力フォームの必須項目", category: BASIC },
    { href: "/kanri/settings/purchase-notice", label: "購入に関する通知設定", hint: "注文・決済の通知先", category: BASIC },
    ...MASTER_TYPES.map((m) => ({
      href: `/kanri/settings/${m.type}`,
      label: m.label,
      count: counts[m.type] ?? 0,
      hint: m.hint,
      category: m.category,
    })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設定（マスタ）</h1>
      <p className="text-sm text-gray-500">見積・請求・発注で使う基本情報を登録します。各種マスタを細分化して管理できます。</p>
      <MasterHub items={items} categories={[BASIC, ...MASTER_CATEGORIES]} />
    </div>
  );
}
