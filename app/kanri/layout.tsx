import Link from "next/link";
import { Search, UserPlus, Bell, HelpCircle, Megaphone } from "lucide-react";
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
      <a href="#kanri-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm">
        本文へスキップ
      </a>
      <header
        className="sticky top-0 z-20 flex h-12 items-center gap-3 px-4 md:h-14"
        style={{ background: "var(--k-chrome, #22262b)", borderBottom: "1px solid var(--k-chrome-line, #34393f)" }}
      >
        <Link href="/kanri" className="flex shrink-0 items-center gap-2">
          <span className="text-base font-bold text-white">川口典礼</span>
          <span className="hidden text-xs text-white/60 sm:inline">葬儀管理ソフト</span>
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" aria-hidden />
        <form action="/kanri/customers" className="hidden max-w-[360px] flex-1 items-center gap-2 sm:flex">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input name="q" placeholder="顧客名・電話番号で検索" className="w-full rounded-[4px] border-0 bg-white py-1.5 pl-8 pr-3 focus:outline-none" style={{ fontSize: 16 }} />
          </div>
          <button className="rounded-[4px] border border-white/50 px-3 py-1.5 text-sm text-white hover:bg-white/10">検索</button>
        </form>
        <div className="ml-auto flex items-center gap-3 text-white/80">
          <Link href="/fuhou" className="flex items-center gap-1.5 rounded-[4px] border border-white/50 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"><Megaphone size={15} />訃報案内へ</Link>
          {/* 旧「起動」。遷移先(/kanri/customers/new)は不変、ラベルだけ業務語彙に */}
          <Link href="/kanri/customers/new" className="flex items-center gap-1 rounded-[4px] px-3 py-1.5 text-sm text-white" style={{ background: "var(--k-action, #35597a)" }}><UserPlus size={15} />新規受付</Link>
          <Bell size={18} className="hidden sm:block" />
          <HelpCircle size={18} className="hidden sm:block" />
          <span className="hidden text-sm text-white sm:inline">松澤 覚</span>
        </div>
      </header>

      <div className="flex">
        <KanriSidebar />
        {/* モバイルは下部タブバー分の余白を確保 */}
        <main id="kanri-main" tabIndex={-1} className="min-w-0 flex-1 p-5 pb-24 md:pb-5">{children}</main>
      </div>

      {/* スマホ: 下部タブバー+全メニュードロワー */}
      <KanriMobileNav />
    </div>
  );
}
