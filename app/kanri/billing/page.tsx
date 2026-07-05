import Link from "next/link";
import { listInvoices, INVOICE_STATUS_LABEL } from "@/lib/kanri/invoices";

export const metadata = { title: "請求管理" };
export const dynamic = "force-dynamic";

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function BillingPage() {
  const invoices = await listInvoices();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">請求管理</h1>
        <Link href="/kanri/estimates" className="rounded border border-[#9b2fae] px-4 py-2 text-sm text-[#9b2fae]">見積から請求書を作成</Link>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["請求日", "故人", "喪主", "請求額", "入金額", "ステータス", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {invoices.length === 0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">請求書がありません。見積詳細から作成できます。</td></tr> :
              invoices.map((iv) => (
                <tr key={iv.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(iv.billedOn)}</td>
                  <td className="px-3 py-2">{iv.deceasedName ?? "—"}</td>
                  <td className="px-3 py-2">{iv.mournerName ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{iv.total.toLocaleString()}円</td>
                  <td className="px-3 py-2 whitespace-nowrap">{iv.paidTotal.toLocaleString()}円</td>
                  <td className="px-3 py-2"><span className={iv.status === "paid" ? "text-green-600" : iv.status === "partial" ? "text-amber-600" : "text-gray-500"}>{INVOICE_STATUS_LABEL[iv.status] ?? iv.status}</span></td>
                  <td className="px-3 py-2"><Link href={`/kanri/billing/${iv.id}`} className="text-xs text-[#9b2fae] underline">詳細</Link></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
