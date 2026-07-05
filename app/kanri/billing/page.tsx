import Link from "next/link";
import { listInvoices, INVOICE_STATUS_LABEL } from "@/lib/kanri/invoices";

export const metadata = { title: "請求書" };
export const dynamic = "force-dynamic";

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function BillingPage() {
  const invoices = await listInvoices();
  return (
    <div>
      {/* 緑ヘッダー＋右上ボタン群 */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">請求書</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/kanri/billing/export" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">請求書CSVダウンロード</a>
          <Link href="/kanri/estimates" className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">見積から請求書を作成</Link>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">ヒット件数: {invoices.length} 件</span></p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["請求日", "故人", "喪主", "請求額", "入金額", "残高", "ステータス", "操作"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {invoices.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">請求書がありません。見積詳細から作成できます。</td></tr> :
                invoices.map((iv) => (
                  <tr key={iv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap">{fmt(iv.billedOn)}</td>
                    <td className="px-4 py-2">{iv.deceasedName ?? "—"}</td>
                    <td className="px-4 py-2">{iv.mournerName ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{iv.total.toLocaleString()}円</td>
                    <td className="px-4 py-2 whitespace-nowrap">{iv.paidTotal.toLocaleString()}円</td>
                    <td className="px-4 py-2 whitespace-nowrap">{(iv.total - iv.paidTotal).toLocaleString()}円</td>
                    <td className="px-4 py-2"><span className={iv.status === "paid" ? "text-green-600" : iv.status === "partial" ? "text-amber-600" : "text-gray-500"}>{INVOICE_STATUS_LABEL[iv.status] ?? iv.status}</span></td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <a href={`/kanri/billing/${iv.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded border border-blue-400 px-2 py-1 text-[11px] text-blue-500">請求書</a>
                        <a href={`/kanri/billing/${iv.id}/receipt`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">領収書</a>
                        <Link href={`/kanri/billing/${iv.id}`} className="rounded border border-[#e8613c] px-2 py-1 text-[11px] text-[#e8613c]">入金</Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
