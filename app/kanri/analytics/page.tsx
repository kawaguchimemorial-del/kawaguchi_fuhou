import { countCustomers, monthlyCustomerCounts } from "@/lib/kanri/data";
import { listEstimates } from "@/lib/kanri/estimates";
import { listInvoices } from "@/lib/kanri/invoices";

export const metadata = { title: "分析" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [customers, monthly, estimates, invoices] = await Promise.all([
    countCustomers(), monthlyCustomerCounts(), listEstimates(), listInvoices(),
  ]);
  const estimateTotal = estimates.reduce((a, e) => a + e.total, 0);
  const billedTotal = invoices.reduce((a, i) => a + i.total, 0);
  const paidTotal = invoices.reduce((a, i) => a + i.paidTotal, 0);
  const unpaidTotal = billedTotal - paidTotal;
  const max = Math.max(1, ...monthly.map((m) => m.count));

  const kpis = [
    { label: "顧客総数", value: `${customers} 件` },
    { label: "見積件数", value: `${estimates.length} 件` },
    { label: "見積合計額", value: `${estimateTotal.toLocaleString()} 円` },
    { label: "請求件数", value: `${invoices.length} 件` },
    { label: "請求総額", value: `${billedTotal.toLocaleString()} 円` },
    { label: "入金総額", value: `${paidTotal.toLocaleString()} 円` },
    { label: "未入金額", value: `${unpaidTotal.toLocaleString()} 円` },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">分析</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-bold text-gray-700">月別顧客登録数</p>
        {monthly.length === 0 ? <p className="text-sm text-gray-400">データがありません。</p> : (
          <div className="flex items-end gap-4" style={{ height: 160 }}>
            {monthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-xs text-gray-600">{m.count}</span>
                <div className="w-full rounded-t bg-[#e8613c]" style={{ height: `${(m.count / max) * 120}px` }} />
                <span className="mt-2 text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
