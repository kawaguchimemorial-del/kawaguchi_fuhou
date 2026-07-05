import Link from "next/link";
import { listPurchaseOrders, ORDER_STATUS_LABEL, PAYABLE_STATUS_LABEL } from "@/lib/kanri/orders";
import { PageHeader } from "@/components/kanri/PageHeader";
export const metadata = { title: "発注管理" };
export const dynamic = "force-dynamic";
function fmt(iso?: string){ if(!iso) return ""; const d=new Date(iso); if(isNaN(d.getTime()))return ""; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function OrdersPage(){
  const orders = await listPurchaseOrders();
  const payableUnpaid = orders.filter(o=>o.paymentStatus!=="paid").reduce((a,o)=>a+o.total,0);
  return (
    <div className="space-y-4">
      <PageHeader title="発注" />
      <p className="text-sm text-gray-500">買掛(未払)合計：{payableUnpaid.toLocaleString()}円</p>
      <p className="text-sm text-gray-500">見積詳細の「発注書を作成」から、商品を発注先ごとに発注できます。</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["発注日","発注先","故人","金額","納品","買掛",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {orders.length===0 ? <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">発注がありません。</td></tr> :
              orders.map(o=>(
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(o.orderedOn)}</td>
                  <td className="px-3 py-2">{o.supplier ?? "—"}</td>
                  <td className="px-3 py-2">{o.deceasedName ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{o.total.toLocaleString()}円</td>
                  <td className="px-3 py-2"><span className={o.status==="delivered"?"text-green-600 text-xs":"text-gray-500 text-xs"}>{ORDER_STATUS_LABEL[o.status]??o.status}</span></td>
                  <td className="px-3 py-2"><span className={o.paymentStatus==="paid"?"text-green-600 text-xs":"text-amber-600 text-xs"}>{PAYABLE_STATUS_LABEL[o.paymentStatus]??o.paymentStatus}</span></td>
                  <td className="px-3 py-2"><Link href={`/kanri/orders/${o.id}`} className="text-xs text-[#9b2fae] underline">詳細</Link></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
