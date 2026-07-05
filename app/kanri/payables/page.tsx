import Link from "next/link";
import { listPurchaseOrders } from "@/lib/kanri/orders";
export const metadata = { title: "買掛残高" };
export const dynamic = "force-dynamic";
export default async function PayablesPage(){
  const rows = (await listPurchaseOrders()).filter(o=>o.paymentStatus!=="paid");
  const total = rows.reduce((a,o)=>a+o.total,0);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">買掛残高</h1>
      <p className="text-sm text-gray-500">未払(買掛)残高合計：{total.toLocaleString()}円</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["発注先","故人","金額",""].map(h=><th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length===0 ? <tr><td colSpan={4} className="px-3 py-10 text-center text-gray-400">買掛残高はありません。</td></tr> :
              rows.map(o=>(<tr key={o.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{o.supplier ?? "—"}</td>
                <td className="px-3 py-2">{o.deceasedName ?? "—"}</td>
                <td className="px-3 py-2 font-bold text-amber-600">{o.total.toLocaleString()}円</td>
                <td className="px-3 py-2"><Link href={`/kanri/orders/${o.id}`} className="text-xs text-[#1aa39a] underline">詳細</Link></td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
