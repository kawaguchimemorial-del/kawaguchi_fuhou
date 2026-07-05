"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, Lightbulb, LogOut, ChevronDown, ChevronRight } from "lucide-react";
import { CRM_NAV, type NavNode } from "@/lib/kanri/nav";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings };

function hasActive(node: NavNode, path: string): boolean {
  if (node.href && (path === node.href || path.startsWith(node.href + "/"))) return true;
  return (node.children ?? []).some((c) => hasActive(c, path));
}

function Section({ node, path, depth }: { node: NavNode; path: string; depth: number }) {
  const active = hasActive(node, path);
  const [open, setOpen] = useState(active);
  const Icon = node.icon ? ICONS[node.icon] : undefined;
  const pad = depth === 0 ? "px-5" : depth === 1 ? "pl-9 pr-4" : "pl-12 pr-4";

  if (!node.children) {
    const isActive = node.href && (path === node.href || path.startsWith(node.href + "/"));
    return (
      <Link href={node.href ?? "#"} className={`flex items-center gap-3 py-2.5 text-sm ${pad} ${isActive ? "bg-[#f2fbfa] font-medium text-[#1aa39a]" : "text-gray-600 hover:bg-gray-50"}`}>
        {Icon && <Icon size={18} className={isActive ? "text-[#1aa39a]" : "text-gray-400"} />}
        {node.label}
      </Link>
    );
  }
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={`flex w-full items-center gap-3 py-2.5 text-sm ${pad} ${active ? "text-[#1aa39a]" : "text-gray-700"} hover:bg-gray-50`}>
        {Icon && <Icon size={18} className={active ? "text-[#1aa39a]" : "text-gray-400"} />}
        <span className="flex-1 text-left font-medium">{node.label}</span>
        {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
      </button>
      {open && <div className="pb-1">{node.children.map((c) => <Section key={c.label} node={c} path={path} depth={depth + 1} />)}</div>}
    </div>
  );
}

export function KanriSidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 overflow-y-auto border-r bg-white md:block" style={{ maxHeight: "calc(100vh - 49px)" }}>
      <nav className="py-2">
        {CRM_NAV.map((n) => <Section key={n.label} node={n} path={path} depth={0} />)}
        <div className="my-2 border-t" />
        <Link href="/kanri" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><Lightbulb size={18} className="text-gray-400" />ヘルプ / トップ</Link>
        <Link href="/admin/ceremonies" className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><LogOut size={18} className="text-gray-400" />訃報案内へ</Link>
      </nav>
    </aside>
  );
}
