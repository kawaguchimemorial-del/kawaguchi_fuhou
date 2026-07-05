import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
import { listInvoices } from "@/lib/kanri/invoices";
export const metadata = { title: "入金管理" };
export const dynamic = "force-dynamic";
function fmt(iso?: string){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function DepositsPage(){
  const invoices = (await listInvoices()).filter(i=>i.paidTotal>0);
  const total = invoices.reduce((a,i)=>a+i.paidTotal,0);
  return (
    <div className="space-y-4">
      <PageHeader title="入金管理" />
      <p className="text-sm text-gray-500">入金合計：{total.toLocaleString()}円</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["請求日","故人","喪主","請求額","入金額","ステータス",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {invoices.length===0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">入金記録がありません。請求書詳細から入金を記録できます。</td></tr> :
              invoices.map(iv=>(<tr key={iv.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{fmt(iv.billedOn)}</td>
                <td className="px-3 py-2">{iv.deceasedName ?? "—"}</td>
                <td className="px-3 py-2">{iv.mournerName ?? "—"}</td>
                <td className="px-3 py-2">{iv.total.toLocaleString()}円</td>
                <td className="px-3 py-2">{iv.paidTotal.toLocaleString()}円</td>
                <td className="px-3 py-2">{iv.status==="paid"?"入金済":iv.status==="partial"?"一部入金":"未入金"}</td>
                <td className="px-3 py-2"><Link href={`/kanri/billing/${iv.id}`} className="text-xs text-[#1aa39a] underline">詳細</Link></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
