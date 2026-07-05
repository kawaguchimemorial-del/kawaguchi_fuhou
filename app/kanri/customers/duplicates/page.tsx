import Link from "next/link";
import { findDuplicateCustomerGroups } from "@/lib/kanri/data";
import { mergeCustomers, excludeFromDedup, deleteCustomerFromDedup } from "@/lib/kanri/actions";

export const metadata = { title: "顧客ダブりチェック" };
export const dynamic = "force-dynamic";

function fmt(iso?: string): string { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export default async function DuplicatesPage() {
  const groups = await findDuplicateCustomerGroups();

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">顧客</h1></div>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-1 font-bold text-gray-800">名前がかぶっているお客様一覧</p>
        <p className="mb-4 text-sm text-red-500">実行すると元には戻せませんので慎重に操作してください。</p>

        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">重複しているお客様はいません。</p>
        ) : (
          <div className="divide-y">
            {groups.map((g, gi) => (
              <form key={gi} action={mergeCustomers} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                {/* 氏名 */}
                <div className="w-40 shrink-0 font-medium text-gray-800">{g.name}</div>

                {/* メンバー行 */}
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="text-gray-400"><tr>{["", "ID", "生年月日", "自宅番号", "携帯番号", "作成日時", ""].map((h, i) => <th key={i} className="px-2 py-1 font-medium">{h}</th>)}</tr></thead>
                    <tbody>
                      {g.customers.map((c, i) => (
                        <tr key={c.id}>
                          <td className="px-2 py-1.5"><input type="radio" name="survivor_id" value={c.id} defaultChecked={i === 0} /><input type="hidden" name="id" value={c.id} /></td>
                          <td className="px-2 py-1.5"><Link href={`/kanri/customers/${c.id}`} className="text-[#1aa39a] underline">{c.customerNo ?? c.id.slice(0, 8)}</Link></td>
                          <td className="px-2 py-1.5 text-gray-500">{c.birthDate ?? ""}</td>
                          <td className="px-2 py-1.5 text-gray-500">{c.telephoneNumber ?? ""}</td>
                          <td className="px-2 py-1.5 text-gray-500">{c.mobileNumber ?? ""}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{fmt(c.createdAt)}</td>
                          <td className="px-2 py-1.5"><button formAction={deleteCustomerFromDedup} name="del_id" value={c.id} className="rounded bg-red-500 px-2 py-1 text-[11px] text-white">× このデータを削除</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* グループ操作 */}
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button formAction={mergeCustomers} className="rounded bg-[#5b6ee1] px-3 py-1.5 text-xs text-white">データを統合する</button>
                  <button formAction={mergeCustomers} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">✎ 選択して統合</button>
                  <button formAction={excludeFromDedup} className="rounded bg-[#4f7cff] px-3 py-1.5 text-xs text-white">ダブり対象から除外</button>
                </div>
              </form>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4"><Link href="/kanri/customers" className="inline-block rounded bg-gray-200 px-5 py-2 text-sm text-gray-700 hover:bg-gray-300">一覧に戻る</Link></div>
    </div>
  );
}
