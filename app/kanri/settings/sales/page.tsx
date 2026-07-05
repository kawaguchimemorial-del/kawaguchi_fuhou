import { listInvoices } from "@/lib/kanri/invoices";

export const metadata = { title: "売上" };
export const dynamic = "force-dynamic";

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function SalesPage() {
  const invoices = await listInvoices();
  const total = invoices.reduce((a, i) => a + i.total, 0);
  const paid = invoices.reduce((a, i) => a + i.paidTotal, 0);
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">売上</h1></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-gray-700">売上（葬儀ごとの売上）</p>
        <div className="flex gap-2 text-xs">
          <a href="/kanri/analytics/sales/export" className="rounded border border-[#2c8c6f] px-3 py-1.5 text-[#2c8c6f]">売上集計CSV</a>
          <a href="/kanri/analytics/sales-detail/export" className="rounded border border-[#2c8c6f] px-3 py-1.5 text-[#2c8c6f]">売上明細CSV</a>
        </div>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500"><tr>{["請求日", "件名（葬儀）", "請求先", "売上額", "入金額", "未収額"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">売上がありません。</td></tr> :
              invoices.map((iv) => (
                <tr key={iv.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{fmt(iv.billedOn)}</td>
                  <td className="px-3 py-2.5">{iv.deceasedName ? `${iv.deceasedName} 様 ご葬儀` : "—"}</td>
                  <td className="px-3 py-2.5">{iv.mournerName ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right">{iv.total.toLocaleString()}円</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right">{iv.paidTotal.toLocaleString()}円</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right">{(iv.total - iv.paidTotal).toLocaleString()}円</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50 font-bold">
              <td colSpan={3} className="px-3 py-3 text-right text-[#2c8c6f]">合計</td>
              <td className="px-3 py-3 text-right">{total.toLocaleString()}円</td>
              <td className="px-3 py-3 text-right">{paid.toLocaleString()}円</td>
              <td className="px-3 py-3 text-right">{(total - paid).toLocaleString()}円</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
