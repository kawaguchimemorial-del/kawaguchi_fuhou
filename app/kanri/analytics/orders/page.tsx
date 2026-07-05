import { listPurchaseOrders } from "@/lib/kanri/orders";
export const metadata = { title: "発注分析" };
export const dynamic = "force-dynamic";
export default async function OrderAnalyticsPage(){
  const orders = await listPurchaseOrders();
  const bySupplier = new Map<string, number>();
  for(const o of orders){ const s=o.supplier||"未設定"; bySupplier.set(s,(bySupplier.get(s)??0)+o.total); }
  const rows=[...bySupplier.entries()].sort((a,b)=>b[1]-a[1]);
  const max=Math.max(1,...rows.map(r=>r[1]));
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">発注分析</h1>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-gray-700">発注先別 発注額</p>
        {rows.length===0 ? <p className="text-sm text-gray-400">発注データがありません。</p> :
          <div className="space-y-2">{rows.map(([s,v])=>(<div key={s} className="flex items-center gap-3 text-sm"><span className="w-32 truncate text-gray-500">{s}</span><div className="h-4 rounded bg-[#2bb8ae]" style={{width:`${(v/max)*60}%`}} /><span>{v.toLocaleString()}円</span></div>))}</div>}
      </div>
    </div>
  );
}
