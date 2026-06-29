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

      <div className="flex">
        {/* サイドナビ */}
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
            <li className="mt-8">
              <Link
                href="/admin/contact"
                className="flex items-center gap-3 px-6 py-2.5 text-[#444] hover:bg-[#f3e9f6]"
              >
                <Phone size={18} style={{ color: ADMIN }} />
                各種お問い合わせ
              </Link>
            </li>
          </ul>
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
