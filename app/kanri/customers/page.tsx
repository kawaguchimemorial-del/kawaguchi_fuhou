import Link from "next/link";
import { listCustomers } from "@/lib/kanri/data";
import { CUSTOMER_STATUSES } from "@/lib/kanri/constants";
import { PageHeader } from "@/components/kanri/PageHeader";

export const dynamic = "force-dynamic";

type SP = { searchParams: Promise<{ q?: string; status?: string }> };

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CustomersPage({ searchParams }: SP) {
  const { q, status } = await searchParams;
  const rows = await listCustomers({ q, status });

  return (
    <div className="space-y-4">
      <PageHeader title="顧客" action={{ label: "＋ 新規登録", href: "/kanri/customers/new" }} />

      <form className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm text-sm">
        <div>
          <label className="block text-xs text-gray-500">キーワード（氏名/カナ/メール/電話/顧客番号）</label>
          <input name="q" defaultValue={q ?? ""} className="mt-1 w-64 rounded border px-3 py-2" placeholder="検索" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">ステータス</label>
          <select name="status" defaultValue={status ?? ""} className="mt-1 rounded border px-3 py-2">
            <option value="">すべて</option>
            {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="rounded bg-gray-700 px-4 py-2 text-white">検索</button>
        <a href="/kanri/customers/export" className="rounded border border-[#1aa39a] px-4 py-2 text-[#1aa39a]">CSVダウンロード</a>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{["顧客番号", "氏名", "カナ", "ステータス", "流入経路", "電話", "メール", "登録日"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-gray-400">該当する顧客がありません。</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{c.customerNo ?? "—"}</td>
                  <td className="px-3 py-2"><Link href={`/kanri/customers/${c.id}`} className="font-medium text-[#1aa39a] underline">{c.lastName} {c.firstName ?? ""}</Link></td>
                  <td className="px-3 py-2 text-gray-500">{[c.lastNameKana, c.firstNameKana].filter(Boolean).join(" ")}</td>
                  <td className="px-3 py-2">{c.status ?? "—"}</td>
                  <td className="px-3 py-2">{c.inflow ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{c.mobileNumber ?? c.telephoneNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{c.email ?? ""}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{rows.length} 件</p>
    </div>
  );
}
