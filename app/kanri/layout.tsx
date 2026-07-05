import Link from "next/link";
import { KanriSidebar } from "@/components/kanri/Sidebar";

export const metadata = {
  title: "川口典礼 葬儀管理ソフト",
  robots: { index: false, follow: false },
};

export default function KanriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900">
      <header className="flex items-center justify-between bg-[#9b2fae] px-4 py-3 text-white">
        <Link href="/kanri" className="font-bold">川口典礼 葬儀管理ソフト</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/kanri/customers/new" className="rounded bg-white/15 px-3 py-1.5 hover:bg-white/25">＋ 新規顧客</Link>
          <span className="opacity-90">松澤 覚</span>
        </div>
      </header>
      <div className="flex">
        <KanriSidebar />
        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
