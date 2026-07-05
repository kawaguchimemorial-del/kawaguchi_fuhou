import Link from "next/link";
import { listCustomers, monthlyCustomerCounts, countCustomers } from "@/lib/kanri/data";

export const dynamic = "force-dynamic";

const ACTIONS = [
  { group: "顧客登録", items: [
    { label: "新規登録", href: "/kanri/customers/new" },
    { label: "顧客情報確認", href: "/kanri/customers" },
  ] },
  { group: "事前相談", items: [
    { label: "顧客呼び出し", href: "/kanri/customers" },
    { label: "事前見積作成", href: "/kanri/estimates/new" },
  ] },
  { group: "葬儀発生", items: [
    { label: "顧客呼び出し", href: "/kanri/customers" },
    { label: "葬儀見積作成", href: "/kanri/estimates/new" },
    { label: "請求書作成", href: "/kanri/billing" },
  ] },
  { group: "その他", items: [
    { label: "入金管理", href: "/kanri/billing" },
    { label: "ユーザー管理", href: "/kanri/settings" },
    { label: "AI遺影写真", href: "/kanri/ai-portrait" },
  ] },
];

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function KanriDashboard() {
  const [recent, monthly, total] = await Promise.all([
    listCustomers(),
    monthlyCustomerCounts(),
    countCustomers(),
  ]);
  const max = Math.max(1, ...monthly.map((m) => m.count));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <span className="text-sm text-gray-500">顧客総数 {total} 件</span>
      </div>

      {/* クイックアクション */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((g) => (
          <div key={g.group} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-gray-700">{g.group}</p>
            <div className="space-y-2">
              {g.items.map((it) => (
                <Link key={it.label} href={it.href} className="block rounded border border-[#9b2fae]/40 px-3 py-2 text-center text-sm text-[#9b2fae] hover:bg-[#f7edf9]">
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 月別顧客登録数 */}
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-gray-700">月別顧客登録数</p>
        {monthly.length === 0 ? (
          <p className="text-sm text-gray-400">データがありません。</p>
        ) : (
          <div className="flex items-end gap-4" style={{ height: 160 }}>
            {monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-xs text-gray-600">{m.count}</span>
                <div className="w-full rounded-t bg-[#e8613c]" style={{ height: `${(m.count / max) * 120}px` }} />
                <span className="mt-2 text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新規登録顧客 */}
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">新規登録顧客</p>
          <Link href="/kanri/customers" className="text-xs text-[#9b2fae] underline">すべてを表示</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs text-gray-500">
              <tr>{["登録日時", "ステータス", "氏名", "メールアドレス"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {recent.length === 0 ? (
                <tr><td colSpan={4} className="px-2 py-8 text-center text-gray-400">顧客が登録されていません。</td></tr>
              ) : (
                recent.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">{fmt(c.createdAt)}</td>
                    <td className="px-2 py-2">{c.status ?? "—"}</td>
                    <td className="px-2 py-2"><Link href={`/kanri/customers/${c.id}`} className="text-[#9b2fae] underline">{c.lastName} {c.firstName ?? ""}</Link></td>
                    <td className="px-2 py-2 text-gray-500">{c.email ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
