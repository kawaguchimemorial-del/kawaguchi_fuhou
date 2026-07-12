"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X, Megaphone, FileText, ImageIcon, Home, Users, ClipboardList, CalendarDays, Menu } from "lucide-react";
import { CRM_NAV } from "@/lib/kanri/nav";
import { Section } from "./Sidebar";

// スマホ用ナビ(md未満): 下部タブバー(主要4+メニュー) + 全メニュードロワー。
// z-40=タブバー / ドロワーはz-50。ページ側のfixed右下FABは全面禁止(15専門家仕様)。
const TABS = [
  { href: "/kanri", label: "ホーム", icon: Home, exact: true },
  { href: "/kanri/customers", label: "顧客", icon: Users },
  { href: "/kanri/estimates", label: "見積・請求", icon: ClipboardList },
  { href: "/kanri/schedule", label: "予定", icon: CalendarDays },
] as const;

export function KanriMobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // ルート遷移で自動的に閉じる
  useEffect(() => {
    setOpen(false);
  }, [path]);

  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));

  return (
    <>
      {/* 下部タブバー */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="主要メニュー">
        <div className="grid h-16 grid-cols-5">
          {TABS.map((t) => {
            const active = isActive(t.href, "exact" in t && t.exact);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 ${active ? "text-[#1aa39a]" : "text-gray-500"}`}>
                {active && <span className="absolute inset-x-3 top-0 h-[2px] rounded-b bg-[#1aa39a]" />}
                <Icon size={22} />
                <span className="text-[12px] leading-none">{t.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} className="flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-gray-500" aria-label="全メニューを開く">
            <Menu size={22} />
            <span className="text-[12px] leading-none">メニュー</span>
          </button>
        </div>
      </nav>

      {/* 全メニュードロワー */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-base font-bold text-[#1aa39a]">川口典礼</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる" className="flex h-11 w-11 items-center justify-center text-gray-400">
                <X size={22} />
              </button>
            </div>

            {/* よく使う導線 */}
            <div className="grid grid-cols-2 gap-2 border-b p-3">
              <Link href="/kanri/funeral-script" className="flex min-h-[48px] items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-2 text-xs font-semibold text-white">
                <FileText size={15} className="shrink-0 text-amber-300" />司会台本・礼状
              </Link>
              <Link href="/kanri/ai-portrait" className="flex min-h-[48px] items-center gap-1.5 rounded-lg bg-[#2c8c6f] px-2.5 py-2 text-xs font-semibold text-white">
                <ImageIcon size={15} className="shrink-0" />AI遺影写真
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {CRM_NAV.map((n) => (
                <Section key={n.label} node={n} path={path} depth={0} />
              ))}
              <div className="my-2 border-t" />
              <Link href="/admin" className="flex min-h-[44px] items-center gap-3 px-5 py-2.5 text-sm text-[#9b2fae] hover:bg-gray-50">
                <Megaphone size={18} className="text-[#9b2fae]" />訃報案内へ
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
