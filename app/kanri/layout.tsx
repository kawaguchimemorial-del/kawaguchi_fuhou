import Link from "next/link";
import { Search, Phone, Bell, List, HelpCircle, Megaphone } from "lucide-react";
import { KanriSidebar } from "@/components/kanri/Sidebar";
import { KanriMobileNav } from "@/components/kanri/MobileNav";

export const metadata = {
  title: "川口典礼 葬儀管理ソフト",
  robots: { index: false, follow: false },
};

export default function KanriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef1f4] text-gray-800">
      {/* トップバー */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-2.5">
        <KanriMobileNav />
        <Link href="/kanri" className="flex shrink-0 items-center gap-2">
          <span className="text-base font-bold text-[#1aa39a]">川口典礼</span>
          <span className="hidden text-xs text-gray-400 sm:inline">葬儀管理ソフト</span>
        </Link>
        <form action="/kanri/customers" className="ml-2 hidden max-w-md flex-1 items-center gap-2 sm:flex">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input name="q" placeholder="顧客キーワード検索" className="w-full rounded border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:outline-none" />
          </div>
          <button className="rounded bg-[#4f7cff] px-3 py-1.5 text-sm text-white">検索</button>
        </form>
        <div className="ml-auto flex items-center gap-3 text-gray-500">
          <Link href="/admin" className="flex items-center gap-1.5 rounded border border-[#9b2fae] px-3 py-1.5 text-sm font-medium text-[#9b2fae] hover:bg-[#f3e9f6]"><Megaphone size={15} />訃報案内へ</Link>
          <Link href="/kanri/customers/new" className="flex items-center gap-1 rounded bg-[#4f7cff] px-3 py-1.5 text-sm text-white"><Phone size={15} />起動</Link>
          <Bell size={18} />
          <List size={18} />
          <HelpCircle size={18} />
          <span className="text-sm text-gray-700">松澤 覚</span>
        </div>
      </header>

      <div className="flex">
        <KanriSidebar />
        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
