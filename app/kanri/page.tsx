import Link from "next/link";
import { UserPlus, Users, FileText, Receipt, CheckSquare, Send, TrendingUp, CircleDollarSign, Bell, ClipboardList } from "lucide-react";
import { listCustomers, monthlyCustomerCounts, countCustomers } from "@/lib/kanri/data";
import { listEstimates, deceasedFullName } from "@/lib/kanri/estimates";
import { Calendar } from "@/components/kanri/Calendar";

export const dynamic = "force-dynamic";

const GROUPS = [
  { title: "顧客登録", items: [
    { label: "新規登録", href: "/kanri/customers/new", icon: UserPlus },
    { label: "顧客情報確認", href: "/kanri/customers", icon: Users },
  ] },
  { title: "事前相談", items: [
    { label: "顧客呼び出し", href: "/kanri/customers", icon: Users },
    { label: "事前見積作成", href: "/kanri/estimates/new", icon: FileText },
  ] },
  { title: "葬儀発生", items: [
    { label: "顧客呼び出し", href: "/kanri/customers", icon: Users },
    { label: "葬儀見積作成", href: "/kanri/estimates/new", icon: FileText },
    { label: "見積もり一覧", href: "/kanri/estimates", icon: ClipboardList },
    { label: "請求書作成", href: "/kanri/billing", icon: Receipt },
  ] },
  { title: "葬儀後アフター", items: [
    { label: "アフターtodo", href: "/kanri/schedule", icon: CheckSquare },
    { label: "SMS配信", href: "/kanri/sms", icon: Send },
  ] },
  { title: "その他", items: [
    { label: "営業日報", href: "/kanri/analytics", icon: FileText },
    { label: "顧客登録推移", href: "/kanri/analytics", icon: TrendingUp },
    { label: "入金管理", href: "/kanri/deposits", icon: CircleDollarSign },
    { label: "ユーザー管理", href: "/kanri/settings", icon: Users },
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
  const [recent, monthly, total, estimates] = await Promise.all([
    listCustomers(), monthlyCustomerCounts(), countCustomers(), listEstimates(),
  ]);
  const max = Math.max(1, ...monthly.map((m) => m.count));
  const events = estimates.flatMap((e) => {
    const evs: { date: string; label: string; type: string }[] = [];
    if (e.wakeAt) evs.push({ date: e.wakeAt, label: `通夜 ${deceasedFullName(e)}`, type: "通夜" });
    if (e.funeralAt) evs.push({ date: e.funeralAt, label: `葬儀 ${deceasedFullName(e)}`, type: "葬儀" });
    return evs;
  });

  return (
    <div>
      {/* 緑のお知らせ帯（全幅） */}
      <div className="-mx-5 -mt-5 bg-[#57ab5a] px-5 pt-5 pb-10">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">未読のお知らせがあります</p>
              <p className="text-lg font-bold">0 件</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1aa39a] text-white"><Bell size={20} /></span>
          </div>
        </div>
      </div>

      <div className="-mt-6 pb-2">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* 左: アクションカード */}
          <div className="space-y-5">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-sm font-bold text-gray-600">{g.title}</p>
                <div className="flex flex-wrap gap-3">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <Link key={it.label} href={it.href} className="flex h-24 w-24 flex-col items-center justify-center gap-2 rounded-lg bg-white shadow-sm transition hover:shadow-md">
                        <Icon size={26} className="text-[#2bb8ae]" />
                        <span className="text-center text-[11px] text-gray-600">{it.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 右: カレンダー */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-600">スケジュール</p>
              <span className="text-xs text-gray-400">顧客総数 {total} 件</span>
            </div>
            <Calendar events={events} />
          </div>
        </div>

        {/* 月別顧客登録数 */}
        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">Customers</p>
          <p className="mb-4 text-sm font-bold text-gray-700">月別顧客登録数</p>
          {monthly.length === 0 ? <p className="text-sm text-gray-400">データがありません。</p> : (
            <div className="flex items-end gap-4" style={{ height: 180 }}>
              {monthly.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-xs text-gray-600">{m.count}</span>
                  <div className="w-full rounded-t bg-[#f2683f]" style={{ height: `${(m.count / max) * 140}px` }} />
                  <span className="mt-2 text-[10px] text-gray-500">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 新規登録顧客 */}
        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-700">新規登録顧客</p>
            <Link href="/kanri/customers" className="rounded bg-[#4f7cff] px-3 py-1 text-xs text-white">すべてを表示</Link>
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
                      <td className="px-2 py-2"><Link href={`/kanri/customers/${c.id}`} className="text-[#1aa39a] underline">{c.lastName} {c.firstName ?? ""}</Link></td>
                      <td className="px-2 py-2 text-gray-500">{c.email ?? ""}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
