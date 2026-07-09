"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Megaphone, FileText, ImageIcon } from "lucide-react";
import { CRM_NAV } from "@/lib/kanri/nav";
import { Section } from "./Sidebar";

// スマホ用のCRMナビ（ハンバーガー＋ドロワー）。md未満で表示。
// PCではサイドバー(KanriSidebar)を使うため md:hidden。
export function KanriMobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // ルート遷移で自動的に閉じる
  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="メニューを開く"
        className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-gray-600"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-base font-bold text-[#1aa39a]">川口典礼</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="text-gray-400">
                <X size={22} />
              </button>
            </div>

            {/* よく使う導線（スマホ運用で頻度の高いもの） */}
            <div className="grid grid-cols-2 gap-2 border-b p-3">
              <Link href="/kanri/funeral-script" className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-2 text-xs font-semibold text-white">
                <FileText size={15} className="shrink-0 text-amber-300" />司会台本・礼状
              </Link>
              <Link href="/kanri/ai-portrait" className="flex items-center gap-1.5 rounded-lg bg-[#2c8c6f] px-2.5 py-2 text-xs font-semibold text-white">
                <ImageIcon size={15} className="shrink-0" />AI遺影写真
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {CRM_NAV.map((n) => (
                <Section key={n.label} node={n} path={path} depth={0} />
              ))}
              <div className="my-2 border-t" />
              <Link href="/admin" className="flex items-center gap-3 px-5 py-2.5 text-sm text-[#9b2fae] hover:bg-gray-50">
                <Megaphone size={18} className="text-[#9b2fae]" />訃報案内へ
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
