import Link from "next/link";
import { listInvoices } from "@/lib/kanri/invoices";
export const metadata = { title: "領収書" };
export const dynamic = "force-dynamic";
export default async function ReceiptsPage(){
  const invoices = await listInvoices();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">領収書</h1>
      <p className="text-sm text-gray-500">請求書ごとに領収書を発行できます。</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["故人","喪主","金額","入金額","領収書",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {invoices.length===0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">請求書がありません。</td></tr> :
              invoices.map(iv=>(<tr key={iv.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{iv.deceasedName ?? "—"}</td>
                <td className="px-3 py-2">{iv.mournerName ?? "—"}</td>
                <td className="px-3 py-2">{iv.total.toLocaleString()}円</td>
                <td className="px-3 py-2">{iv.paidTotal.toLocaleString()}円</td>
                <td className="px-3 py-2"><a href={`/kanri/billing/${iv.id}/receipt`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1aa39a] underline">領収書PDF</a></td>
                <td className="px-3 py-2"><Link href={`/kanri/billing/${iv.id}`} className="text-xs text-gray-500 underline">請求詳細</Link></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
