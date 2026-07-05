"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Receipt, ShoppingCart, CalendarDays, ImageIcon, LineChart, Send, Settings, Lightbulb, LogOut, FileText, Package } from "lucide-react";

const NAV = [
  { href: "/kanri/customers", label: "顧客管理", icon: Users },
  { href: "/kanri/estimates", label: "見積管理", icon: FileText },
  { href: "/kanri/products", label: "商品", icon: Package },
  { href: "/kanri/billing", label: "請求管理", icon: Receipt },
  { href: "/kanri/orders", label: "発注管理", icon: ShoppingCart },
  { href: "/kanri/schedule", label: "スケジュール管理", icon: CalendarDays },
  { href: "/kanri/ai-portrait", label: "AI遺影写真", icon: ImageIcon },
  { href: "/kanri/analytics", label: "分析", icon: LineChart },
  { href: "/kanri/sms", label: "SMS", icon: Send },
  { href: "/kanri/settings", label: "設定", icon: Settings },
];

export function KanriSidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-white md:flex md:flex-col">
      <nav className="flex-1 py-2 text-sm">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href}
              className={"flex items-center gap-3 px-5 py-3 " + (active ? "bg-[#f2fbfa] font-medium text-[#1aa39a]" : "text-gray-600 hover:bg-gray-50")}>
              <Icon size={18} className={active ? "text-[#1aa39a]" : "text-gray-400"} />
              {n.label}
            </Link>
          );
        })}
        <div className="my-2 border-t" />
        <Link href="/kanri" className="flex items-center gap-3 px-5 py-3 text-gray-600 hover:bg-gray-50"><Lightbulb size={18} className="text-gray-400" />ヘルプ / ダッシュボード</Link>
        <Link href="/admin/ceremonies" className="flex items-center gap-3 px-5 py-3 text-gray-600 hover:bg-gray-50"><LogOut size={18} className="text-gray-400" />訃報案内へ</Link>
      </nav>
    </aside>
  );
}
