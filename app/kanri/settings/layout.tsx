import Link from "next/link";

// ユーザー管理画面: 白ヘッダー＋上部緑ライン＋横タブ（実スマート葬儀と同一順序）
const TABS = [
  { label: "故人", href: "/kanri/settings/deceased" },
  { label: "参列者", href: "/kanri/settings/attendees" },
  { label: "参列者からのメッセージ", href: "/kanri/settings/messages" },
  { label: "会場", href: "/kanri/settings/venue" },
  { label: "商品種別", href: "/kanri/settings/product_kind" },
  { label: "商品", href: "/kanri/products" },
  { label: "値引商品", href: "/kanri/settings/discounted_product" },
  { label: "まとめ商品", href: "/kanri/settings/rough_product" },
  { label: "発注先", href: "/kanri/settings/supplier" },
  { label: "送料", href: "/kanri/settings/shipping" },
  { label: "売上", href: "/kanri/settings/sales" },
  { label: "口座", href: "/kanri/settings/bank" },
  { label: "備考定型文", href: "/kanri/settings/note_master" },
  { label: "会社情報", href: "/kanri/settings/company" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-5">
      <div className="border-t-4 border-[#2c8c6f] bg-white shadow-sm">
        <div className="flex items-center gap-4 px-4 py-2">
          <Link href="/kanri/settings" className="whitespace-nowrap text-lg font-bold text-[#2c8c6f]">川口典礼</Link>
          <nav className="flex items-center gap-1 overflow-x-auto text-[13px]">
            {TABS.map((t) => (
              <Link key={t.label} href={t.href} className="whitespace-nowrap rounded px-2 py-1.5 text-gray-700 hover:bg-gray-100 hover:text-[#2c8c6f]">{t.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-xs text-gray-500">
            <Link href="/kanri/settings/users" className="hover:text-[#2c8c6f]">ユーザー管理</Link>
            <Link href="/kanri/settings/masters" className="hover:text-[#2c8c6f]">マスタ一覧</Link>
            <span>【株式会社川口典礼】</span>
            <span>松澤覚 ▾</span>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
