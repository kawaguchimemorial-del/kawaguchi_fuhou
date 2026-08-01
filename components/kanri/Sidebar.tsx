"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, Lightbulb, LogOut, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from "lucide-react";
import { CRM_NAV, type NavNode } from "@/lib/kanri/nav";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, FileText };

// ── サイドバーの折りたたみ設定（localStorage / Reactの外の状態） ──────────
const COLLAPSE_KEY = "kanri-sidebar";
const collapseListeners = new Set<() => void>();

function subscribeCollapsed(onChange: () => void): () => void {
  collapseListeners.add(onChange);
  // 他タブでの変更も反映する（キャッシュを捨ててから再読込させる）
  const onStorage = () => {
    collapsedCache = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    collapseListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// 真値はこのメモリ側。localStorage へ書けない環境（プライベートブラウジング等）でも
// セッション中の開閉は効くようにしておく。
let collapsedCache: boolean | null = null;

function getCollapsed(): boolean {
  if (collapsedCache === null) {
    try {
      collapsedCache = localStorage.getItem(COLLAPSE_KEY) === "collapsed";
    } catch {
      collapsedCache = false;
    }
  }
  return collapsedCache;
}

function setCollapsedPref(next: boolean): void {
  collapsedCache = next;
  try {
    localStorage.setItem(COLLAPSE_KEY, next ? "collapsed" : "open");
  } catch {
    /* 書けなくてもメモリ側で開閉は成立する */
  }
  collapseListeners.forEach((fn) => fn());
}

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
    // アクティブは「左3pxバー」ではなく角丸ピルの塗りで示す
    return (
      <Link
        href={node.href ?? "#"}
        aria-current={isActive ? "page" : undefined}
        className={`mx-2 flex min-h-[44px] items-center gap-3 rounded-[4px] py-2.5 text-sm ${pad} ${isActive ? "font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
        style={isActive ? { background: "var(--k-brand-tint-strong, #dde9e3)", color: "var(--k-ink, #1f2421)" } : undefined}
      >
        {Icon && <Icon size={18} className={isActive ? "" : "text-gray-400"} style={isActive ? { color: "var(--k-brand-bg, #1f6b54)" } : undefined} />}
        {node.label}
      </Link>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={`flex min-h-[44px] w-full items-center gap-3 py-2.5 text-sm ${pad} text-gray-700 hover:bg-gray-50`}>
        {Icon && <Icon size={18} className={active ? "" : "text-gray-400"} style={active ? { color: "var(--k-brand-bg, #1f6b54)" } : undefined} />}
        <span className="flex-1 text-left font-medium">{node.label}</span>
        {/* 配下に現在地があることを丸ドットで示す(色だけに依存しない) */}
        {active && <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--k-brand-bg, #1f6b54)" }} />}
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
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-[4px] ${active ? "" : "text-gray-500 hover:bg-gray-100"}`}
      style={active ? { background: "var(--k-brand-tint-strong, #dde9e3)", color: "var(--k-brand-bg, #1f6b54)" } : undefined}
    >
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
  // localStorage は React の外にある状態なので useSyncExternalStore で購読する。
  // effect 内で setState するとハイドレーション後に余計な再描画が連鎖するため。
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsed, () => false);
  // オーバーレイは「どのパスで開いたか」で持つ。ルートが変われば自動で閉じるので effect が要らない。
  const [overlayPath, setOverlayPath] = useState<string | null>(null);
  const overlay = overlayPath !== null && overlayPath === path;
  const setOverlay = (open: boolean) => setOverlayPath(open ? path : null);
  const toggleCollapsed = () => setCollapsedPref(!getCollapsed());

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
