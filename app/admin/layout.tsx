import Link from "next/link";
import { getFuneralHomeName } from "@/lib/admin/data";
import { Home, List, Flower2, Settings, FileDown, Phone } from "lucide-react";

// 管理画面（葬儀社/operator）レイアウト。実物に倣い紫テーマ。
// TODO(auth): middleware＋Supabase Authでセッション保護。未ログインは /account/sign-in へ。

// 香典決済・贈答品・お悔やみ品（おくりもの）は今回実装しないため非表示。
const NAV = [
  { href: "/admin", label: "マイページ", Icon: Home },
  { href: "/admin/ceremonies", label: "葬儀一覧", Icon: List },
  { href: "/admin/orders", label: "供花・供物 注文一覧", Icon: Flower2 },
  { href: "/admin/settings", label: "設定", Icon: Settings },
  { href: "/admin/downloads", label: "資料ダウンロード", Icon: FileDown },
  { href: "/admin/contact", label: "各種お問い合わせ", Icon: Phone },
];

const ADMIN = "#9b2fae";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const homeName = await getFuneralHomeName();
  return (
    <div className="min-h-screen bg-[#f7f5f8]">
      {/* ヘッダー */}
      <header
        className="flex items-center justify-between px-6 py-4 text-white"
        style={{ background: ADMIN }}
      >
        <span className="font-bold">マイページ</span>
        <span className="rounded bg-white/95 px-3 py-1.5 text-sm text-[#333]">
          👤 {homeName}
        </span>
      </header>

      {/* モバイル用ナビ（横スクロール・md未満で表示） */}
      <nav className="md:hidden border-b bg-white">
        <ul className="flex gap-1 overflow-x-auto px-3 py-2 text-xs [-webkit-overflow-scrolling:touch]">
          {NAV.map(({ href, label, Icon }) => (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[#444]"
              >
                <Icon size={14} style={{ color: ADMIN }} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex">
        {/* サイドナビ（md以上） */}
        <nav className="hidden w-56 shrink-0 border-r bg-white py-6 md:block">
          <ul className="space-y-1 text-sm">
            {NAV.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-6 py-2.5 text-[#444] hover:bg-[#f3e9f6]"
                >
                  <Icon size={18} style={{ color: ADMIN }} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
