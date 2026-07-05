import { listEstimates } from "@/lib/kanri/estimates";
import { listInvoices } from "@/lib/kanri/invoices";
export const metadata = { title: "売上分析" };
export const dynamic = "force-dynamic";
export default async function SalesPage(){
  const [est, inv] = await Promise.all([listEstimates(), listInvoices()]);
  const byMonth = new Map<string, number>();
  for(const i of inv){ const d=new Date(i.billedOn||i.createdAt); if(isNaN(d.getTime()))continue; const k=`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}`; byMonth.set(k,(byMonth.get(k)??0)+i.total); }
  const rows=[...byMonth.entries()].sort((a,b)=>a[0]<b[0]?1:-1);
  const max=Math.max(1,...rows.map(r=>r[1]));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">売上分析</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">見積合計</p><p className="mt-1 text-2xl font-bold">{est.reduce((a,e)=>a+e.total,0).toLocaleString()}円</p></div>
        <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">請求合計</p><p className="mt-1 text-2xl font-bold">{inv.reduce((a,i)=>a+i.total,0).toLocaleString()}円</p></div>
        <div className="rounded-lg bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">入金合計</p><p className="mt-1 text-2xl font-bold">{inv.reduce((a,i)=>a+i.paidTotal,0).toLocaleString()}円</p></div>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-gray-700">月別売上（請求ベース）</p>
        {rows.length===0 ? <p className="text-sm text-gray-400">データがありません。</p> :
          <div className="space-y-2">{rows.map(([m,v])=>(<div key={m} className="flex items-center gap-3 text-sm"><span className="w-20 text-gray-500">{m}</span><div className="h-4 rounded bg-[#f2683f]" style={{width:`${(v/max)*70}%`}} /><span>{v.toLocaleString()}円</span></div>))}</div>}
      </div>
    </div>
  );
}
