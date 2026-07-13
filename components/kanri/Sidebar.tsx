"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, Lightbulb, LogOut, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from "lucide-react";
import { CRM_NAV, type NavNode } from "@/lib/kanri/nav";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, FileText };

function hasActive(node: NavNode, path: string): boolean {
  if (node.href && (path === node.href || path.startsWith(node.href + "/"))) return true;
  return (node.children ?? []).some((c) => hasActive(c, path));
}

export function Section({ node, path, depth }: { node: NavNode; path: string; depth: number }) {
  const active = hasActive(node, path);
  const [open, setOpen] = useState(active);
  const Icon = node.icon ? ICONS[node.icon] : undefined;
  const pad = depth === 0 ? "px-5" : depth === 1 ? "pl-9 pr-4" : "pl-12 pr-4";

  if (!node.children) {
    const isActive = node.href && (path === node.href || path.startsWith(node.href + "/"));
    return (
      <Link href={node.href ?? "#"} className={`relative flex min-h-[44px] items-center gap-3 py-2.5 text-sm ${pad} ${isActive ? "bg-[#f2fbfa] font-medium text-[#1aa39a]" : "text-gray-600 hover:bg-gray-50"}`}>
        {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-[#1aa39a]" />}
        {Icon && <Icon size={18} className={isActive ? "text-[#1aa39a]" : "text-gray-400"} />}
        {node.label}
      </Link>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={`flex min-h-[44px] w-full items-center gap-3 py-2.5 text-sm ${pad} ${active ? "text-[#1aa39a]" : "text-gray-700"} hover:bg-gray-50`}>
        {Icon && <Icon size={18} className={active ? "text-[#1aa39a]" : "text-gray-400"} />}
        <span className="flex-1 text-left font-medium">{node.label}</span>
        {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
      </button>
      {open && <div className="pb-1">{node.children.map((c) => <Section key={c.label} node={c} path={path} depth={depth + 1} />)}</div>}
    </div>
  );
}

// アイコンレール(md〜lg / lg+折りたたみ時)の1項目
function RailItem({ node, path, onExpand }: { node: NavNode; path: string; onExpand: () => void }) {
  const active = hasActive(node, path);
  const Icon = node.icon ? ICONS[node.icon] : FileText;
  const inner = (
    <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${active ? "bg-[#f2fbfa] text-[#1aa39a]" : "text-gray-500 hover:bg-gray-100"}`}>
      <Icon size={20} />
    </span>
  );
  if (!node.children && node.href) {
    return <Link href={node.href} aria-label={node.label} title={node.label} className="flex justify-center py-1">{inner}</Link>;
  }
  return <button type="button" aria-label={node.label} title={node.label} onClick={onExpand} className="flex w-full justify-center py-1">{inner}</button>;
}

export function KanriSidebar() {
  const path = usePathname();
  // lg+ の折りたたみ状態(localStorage保持)。md〜lgは常にレール+タップでオーバーレイ展開。
  const [collapsed, setCollapsed] = useState(false);
  const [overlay, setOverlay] = useState(false); // レール時のオーバーレイ展開
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("kanri-sidebar") === "collapsed"); } catch { /* noop */ }
  }, []);
  useEffect(() => { setOverlay(false); }, [path]); // ルート遷移で閉じる
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("kanri-sidebar", next ? "collapsed" : "open"); } catch { /* noop */ }
      return next;
    });
  };

  const fullNav = (
    <nav className="py-2">
      {CRM_NAV.map((n) => <Section key={n.label} node={n} path={path} depth={0} />)}
      <div className="my-2 border-t" />
      <Link href="/kanri" className="flex min-h-[44px] items-center gap-3 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><Lightbulb size={18} className="text-gray-400" />ヘルプ / トップ</Link>
      <Link href="/fuhou/ceremonies" className="flex min-h-[44px] items-center gap-3 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><LogOut size={18} className="text-gray-400" />訃報案内へ</Link>
    </nav>
  );

  const rail = (
    <div className="flex flex-col items-center py-2">
      {CRM_NAV.map((n) => <RailItem key={n.label} node={n} path={path} onExpand={() => setOverlay(true)} />)}
      <div className="my-2 w-8 border-t" />
      <Link href="/fuhou/ceremonies" aria-label="訃報案内へ" title="訃報案内へ" className="flex justify-center py-1">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"><LogOut size={20} /></span>
      </Link>
    </div>
  );

  return (
    <>
      {/* md〜lg: アイコンレール(タップでオーバーレイ展開) */}
      <aside className="hidden w-16 shrink-0 overflow-y-auto border-r bg-white md:block lg:hidden" style={{ maxHeight: "calc(100vh - 56px)" }}>
        {rail}
      </aside>
      {overlay && (
        <div className="fixed inset-0 z-40 hidden md:block lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOverlay(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-white shadow-xl">{fullNav}</aside>
        </div>
      )}

      {/* lg+: フルサイドバー(折りたたみ可) */}
      <aside className={`hidden shrink-0 overflow-y-auto border-r bg-white lg:block ${collapsed ? "w-16" : "w-60"}`} style={{ maxHeight: "calc(100vh - 56px)" }}>
        <div className="flex justify-end px-2 pt-2">
          <button type="button" onClick={toggleCollapsed} aria-label={collapsed ? "メニューを展開" : "メニューを折りたたむ"} className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
        {collapsed ? rail : fullNav}
      </aside>
    </>
  );
}
