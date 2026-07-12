import Link from "next/link";
import { Search, Phone, Bell, HelpCircle, Megaphone } from "lucide-react";
import { KanriSidebar } from "@/components/kanri/Sidebar";
import { KanriMobileNav } from "@/components/kanri/MobileNav";
import "./theme-v2.css";

export const metadata = {
  title: "川口典礼 葬儀管理ソフト",
  robots: { index: false, follow: false },
};

export default function KanriLayout({ children }: { children: React.ReactNode }) {
  // UIテーマv2。NEXT_PUBLIC_KANRI_V2=0 で旧デザインへ即時切替(キルスイッチ)。
  const v2 = process.env.NEXT_PUBLIC_KANRI_V2 !== "0";
  return (
    <div className="min-h-screen bg-[#eef1f4] text-gray-800" {...(v2 ? { "data-kanri-v2": "" } : {})}>
      {/* トップバー(ダーク帯+金ヘアライン) */}
      <header
        className="sticky top-0 z-20 flex h-12 items-center gap-3 px-4 md:h-14"
        style={{ background: "var(--k-brand-strong, #17493d)", borderBottom: "2px solid var(--k-accent-hairline, #b08d3f)" }}
      >
        <Link href="/kanri" className="flex shrink-0 items-center gap-2">
          <span className="text-base font-bold text-white">川口典礼</span>
          <span className="hidden text-xs text-white/60 sm:inline">葬儀管理ソフト</span>
        </Link>
        <form action="/kanri/customers" className="ml-2 hidden max-w-md flex-1 items-center gap-2 sm:flex">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input name="q" placeholder="顧客キーワード検索" className="w-full rounded border-0 bg-white py-1.5 pl-8 pr-3 focus:outline-none" style={{ fontSize: 16 }} />
          </div>
          <button className="rounded bg-[#4f7cff] px-3 py-1.5 text-sm text-white">検索</button>
        </form>
        <div className="ml-auto flex items-center gap-3 text-white/80">
          <Link href="/admin" className="flex items-center gap-1.5 rounded border border-white/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"><Megaphone size={15} />訃報案内へ</Link>
          <Link href="/kanri/customers/new" className="flex items-center gap-1 rounded bg-[#4f7cff] px-3 py-1.5 text-sm text-white"><Phone size={15} />起動</Link>
          <Bell size={18} className="hidden sm:block" />
          <HelpCircle size={18} className="hidden sm:block" />
          <span className="hidden text-sm text-white sm:inline">松澤 覚</span>
        </div>
      </header>

      <div className="flex">
        <KanriSidebar />
        {/* モバイルは下部タブバー分の余白を確保 */}
        <main className="min-w-0 flex-1 p-5 pb-24 md:pb-5">{children}</main>
      </div>

      {/* スマホ: 下部タブバー+全メニュードロワー */}
      <KanriMobileNav />
    </div>
  );
}
