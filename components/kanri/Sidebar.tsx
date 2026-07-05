"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/kanri", label: "ダッシュボード", exact: true },
  { href: "/kanri/customers", label: "顧客管理" },
  { href: "/kanri/estimates", label: "見積管理" },
  { href: "/kanri/products", label: "商品" },
  { href: "/kanri/billing", label: "請求管理" },
  { href: "/kanri/orders", label: "発注管理" },
  { href: "/kanri/schedule", label: "スケジュール管理" },
  { href: "/kanri/ai-portrait", label: "AI遺影写真" },
  { href: "/kanri/analytics", label: "分析" },
  { href: "/kanri/sms", label: "SMS" },
  { href: "/kanri/settings", label: "設定" },
];

export function KanriSidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-white md:block">
      <div className="border-b px-5 py-4">
        <Link href="/kanri" className="block text-base font-bold text-[#9b2fae]">
          川口典礼<span className="ml-1 text-xs font-normal text-gray-500">葬儀管理ソフト</span>
        </Link>
      </div>
      <nav className="py-3 text-sm">
        {NAV.map((n) => {
          const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              className={
                "block px-5 py-2.5 " +
                (active ? "border-l-4 border-[#9b2fae] bg-[#f7edf9] font-medium text-[#9b2fae]" : "border-l-4 border-transparent text-gray-700 hover:bg-gray-50")
              }
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
