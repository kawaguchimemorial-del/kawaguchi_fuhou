import Link from "next/link";
import { notFound } from "next/navigation";
import { getPurchaseOrder, ORDER_STATUS_LABEL, PAYABLE_STATUS_LABEL } from "@/lib/kanri/orders";
import { markOrderDelivered, toggleOrderPaid, deletePurchaseOrder } from "@/lib/kanri/actions";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
function fmt(iso?: string){ if(!iso) return "—"; const d=new Date(iso); if(isNaN(d.getTime()))return "—"; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function OrderDetail({ params }: Params){
  const { id } = await params;
  const o = await getPurchaseOrder(id);
  if(!o) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">発注書詳細</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/kanri/orders" className="rounded border px-3 py-1.5">一覧へ</Link>
          {o.estimateId && <Link href={`/kanri/estimates/${o.estimateId}`} className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">見積を開く</Link>}
          {o.status!=="delivered" && <form action={markOrderDelivered}><input type="hidden" name="id" value={o.id}/><button className="rounded bg-[#1aa39a] px-3 py-1.5 text-white">納品済にする</button></form>}
          <form action={toggleOrderPaid}><input type="hidden" name="id" value={o.id}/><input type="hidden" name="paid" value={o.paymentStatus==="paid"?"0":"1"}/><button className="rounded border px-3 py-1.5">{o.paymentStatus==="paid"?"未払に戻す":"支払済にする"}</button></form>
          <form action={deletePurchaseOrder}><input type="hidden" name="id" value={o.id}/><button className="rounded border border-red-400 px-3 py-1.5 text-red-500">削除</button></form>
        </div>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm divide-y">
        <div className="flex gap-4 py-2"><span className="w-28 text-sm text-gray-500">発注先</span><span className="text-sm">{o.supplier ?? "—"}</span></div>
        <div className="flex gap-4 py-2"><span className="w-28 text-sm text-gray-500">発注日</span><span className="text-sm">{fmt(o.orderedOn)}</span></div>
        <div className="flex gap-4 py-2"><span className="w-28 text-sm text-gray-500">納品状況</span><span className="text-sm">{ORDER_STATUS_LABEL[o.status]??o.status}{o.deliveredOn?`（${fmt(o.deliveredOn)}）`:""}</span></div>
        <div className="flex gap-4 py-2"><span className="w-28 text-sm text-gray-500">買掛</span><span className="text-sm">{PAYABLE_STATUS_LABEL[o.paymentStatus]??o.paymentStatus}</span></div>
        <div className="flex gap-4 py-2"><span className="w-28 text-sm text-gray-500">合計</span><span className="text-sm font-bold">{o.total.toLocaleString()}円</span></div>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#1aa39a]">発注明細</p>
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500"><tr>{["品名","単価","数量","金額"].map(h=><th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {(o.items??[]).map((it,i)=>(<tr key={i}><td className="px-2 py-2">{it.name}</td><td className="px-2 py-2">{it.unitPrice.toLocaleString()}円</td><td className="px-2 py-2">{it.quantity}</td><td className="px-2 py-2">{it.amount.toLocaleString()}円</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
