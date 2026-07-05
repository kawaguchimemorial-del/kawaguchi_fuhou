import Link from "next/link";

// ユーザー管理画面(設定)は CRM とは別UIとして、緑基調の横タブナビを持つ。
const TABS = [
  { label: "会社情報", href: "/kanri/settings/company" },
  { label: "ユーザー管理", href: "/kanri/settings/users" },
  { label: "会場", href: "/kanri/settings/venue" },
  { label: "商品種別", href: "/kanri/settings/product_kind" },
  { label: "商品", href: "/kanri/products" },
  { label: "値引商品", href: "/kanri/settings/discounted_product" },
  { label: "まとめ商品", href: "/kanri/settings/rough_product" },
  { label: "発注先", href: "/kanri/settings/supplier" },
  { label: "送料", href: "/kanri/settings/shipping" },
  { label: "備考定型文", href: "/kanri/settings/note_master" },
  { label: "マスタ一覧", href: "/kanri/settings" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-5">
      <div className="border-b bg-[#2c8c6f] px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-1 text-sm">
          <span className="mr-3 whitespace-nowrap font-bold text-white">葬儀会社 設定</span>
          {TABS.map((t) => (
            <Link key={t.label} href={t.href} className="whitespace-nowrap rounded px-3 py-1.5 text-white/90 hover:bg-white/15">{t.label}</Link>
          ))}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
