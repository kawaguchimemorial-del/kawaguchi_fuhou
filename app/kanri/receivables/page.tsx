import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
import { listInvoices } from "@/lib/kanri/invoices";
export const metadata = { title: "売掛残高" };
export const dynamic = "force-dynamic";
export default async function ReceivablesPage(){
  const rows = (await listInvoices()).map(i=>({...i, remaining:i.total-i.paidTotal})).filter(i=>i.remaining>0);
  const total = rows.reduce((a,i)=>a+i.remaining,0);
  return (
    <div className="space-y-4">
      <PageHeader title="売掛残高" />
      <p className="text-sm text-gray-500">未回収(売掛)残高合計：{total.toLocaleString()}円</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["故人","喪主","請求額","入金額","残高",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length===0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">売掛残高はありません。</td></tr> :
              rows.map(iv=>(<tr key={iv.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{iv.deceasedName ?? "—"}</td>
                <td className="px-3 py-2">{iv.mournerName ?? "—"}</td>
                <td className="px-3 py-2">{iv.total.toLocaleString()}円</td>
                <td className="px-3 py-2">{iv.paidTotal.toLocaleString()}円</td>
                <td className="px-3 py-2 font-bold text-amber-600">{iv.remaining.toLocaleString()}円</td>
                <td className="px-3 py-2"><Link href={`/kanri/billing/${iv.id}`} className="text-xs text-[#1aa39a] underline">詳細</Link></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
