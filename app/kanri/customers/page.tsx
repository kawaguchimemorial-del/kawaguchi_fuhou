import Link from "next/link";
import { listCustomers } from "@/lib/kanri/data";
import { deleteCustomer } from "@/lib/kanri/actions";
import { CUSTOMER_STATUSES } from "@/lib/kanri/constants";

export const metadata = { title: "顧客" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ q?: string; status?: string | string[] }> };

function fmt(iso?: string): string { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function CustomersPage({ searchParams }: SP) {
  const { q, status } = await searchParams;
  const statuses = Array.isArray(status) ? status : status ? [status] : [];
  let rows = await listCustomers({ q });
  if (statuses.length) rows = rows.filter((c) => c.status && statuses.includes(c.status));

  return (
    <div>
      {/* 緑ヘッダー＋右上ボタン群 */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">顧客</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/kanri/customers/export?type=customer" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">顧客CSVダウンロード</a>
          <a href="/kanri/customers/export?type=souke" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">葬家CSVダウンロード</a>
          <a href="/kanri/customers/export?type=member" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">会員CSVダウンロード</a>
          <Link href="/kanri/customers/new" className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">顧客 追加</Link>
          <Link href="/kanri/customers/import" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">顧客 CSVインポート</Link>
          <Link href="/kanri/customers/duplicates" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">顧客 ダブリチェック</Link>
        </div>
      </div>

      {/* 検索パネル */}
      <form className="mb-4 space-y-3 rounded-lg bg-white p-4 shadow-sm text-sm">
        <div>
          <label className="block text-xs text-gray-500">キーワード（氏名/カナ/メール/電話/顧客番号）</label>
          <input name="q" defaultValue={q ?? ""} className="mt-1 w-full rounded border px-3 py-2" placeholder="検索" />
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">ステータス</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CUSTOMER_STATUSES.map((s) => (
              <label key={s} className="flex items-center gap-1 text-xs">
                <input type="checkbox" name="status" value={s} defaultChecked={statuses.includes(s)} /> {s}
              </label>
            ))}
          </div>
        </div>
        <button className="rounded bg-[#2c8c6f] px-5 py-2 text-white">🔍 検索</button>
      </form>

      {/* 一覧 */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">ヒット件数: {rows.length} 件</span></p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600">
              <tr>{["顧客番号", "ステータス", "氏名", "カナ", "電話", "メールアドレス", "登録日", "操作"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">該当する顧客がありません。</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{c.customerNo ?? "—"}</td>
                    <td className="px-4 py-2">{c.status ?? "—"}</td>
                    <td className="px-4 py-2 font-medium">{c.lastName} {c.firstName ?? ""}</td>
                    <td className="px-4 py-2 text-gray-500">{[c.lastNameKana, c.firstNameKana].filter(Boolean).join(" ")}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{c.mobileNumber ?? c.telephoneNumber ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{c.email ?? ""}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{fmt(c.createdAt)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Link href={`/kanri/customers/${c.id}`} className="rounded border border-blue-400 px-2 py-1 text-[11px] text-blue-500">詳細確認</Link>
                        <Link href={`/kanri/customers/${c.id}`} className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">編集</Link>
                        <form action={deleteCustomer}><input type="hidden" name="id" value={c.id} /><button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button></form>
                      </div>
                    </td>
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
