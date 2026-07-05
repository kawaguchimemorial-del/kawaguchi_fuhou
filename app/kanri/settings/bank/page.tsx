import Link from "next/link";
import { getCompanyInfo } from "@/lib/kanri/masters";

export const metadata = { title: "口座" };
export const dynamic = "force-dynamic";

export default async function BankPage() {
  const co = await getCompanyInfo();
  const hasBank = !!(co.bank_name || co.bank_branch || co.bank_account_name);
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">口座</h1></div>
      <p className="mb-3 font-bold text-gray-700">口座一覧</p>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="mb-3 text-right">
          <Link href="/kanri/settings/company" className="inline-block rounded bg-[#2c8c6f] px-4 py-2 text-sm text-white">＋ 口座 追加</Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-600"><tr>{["銀行名", "銀行支店名", "口座名義人", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {!hasBank ? <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">口座が登録されていません。</td></tr> : (
              <tr className="bg-gray-50/60">
                <td className="px-3 py-3">{co.bank_name ?? ""}</td>
                <td className="px-3 py-3">{co.bank_branch ?? ""}</td>
                <td className="px-3 py-3">{co.bank_account_name ?? ""}</td>
                <td className="px-3 py-3 text-right">
                  <Link href="/kanri/settings/company" className="mr-2 rounded border border-[#2c8c6f] px-3 py-1 text-xs text-[#2c8c6f]">✎ 編集</Link>
                  <span className="text-xs text-red-400">× 削除</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
