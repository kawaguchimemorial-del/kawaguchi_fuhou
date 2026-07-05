import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
import { listPurchaseOrders, ORDER_STATUS_LABEL } from "@/lib/kanri/orders";
export const metadata = { title: "納品管理" };
export const dynamic = "force-dynamic";
function fmt(iso?: string){ if(!iso) return "—"; const d=new Date(iso); if(isNaN(d.getTime()))return "—"; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function DeliveriesPage(){
  const orders = await listPurchaseOrders();
  return (
    <div className="space-y-4">
      <PageHeader title="納品管理" />
      <p className="text-sm text-gray-500">発注の納品状況を管理します。</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["発注日","発注先","故人","金額","納品状況","納品日",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {orders.length===0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">発注がありません。</td></tr> :
              orders.map(o=>(<tr key={o.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{fmt(o.orderedOn)}</td>
                <td className="px-3 py-2">{o.supplier ?? "—"}</td>
                <td className="px-3 py-2">{o.deceasedName ?? "—"}</td>
                <td className="px-3 py-2">{o.total.toLocaleString()}円</td>
                <td className="px-3 py-2"><span className={o.status==="delivered"?"text-green-600 text-xs":"text-gray-500 text-xs"}>{ORDER_STATUS_LABEL[o.status]??o.status}</span></td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(o.deliveredOn)}</td>
                <td className="px-3 py-2"><Link href={`/kanri/orders/${o.id}`} className="text-xs text-[#1aa39a] underline">詳細</Link></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
