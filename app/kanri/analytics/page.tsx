import { PageHeader } from "@/components/kanri/PageHeader";
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
      {/* 実画面準拠: 「分析 - 売上実績」＋年月レンジ＋表示 */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">分析 - 売上実績</h1>
        <form className="flex flex-wrap items-center gap-1.5 text-sm">
          <select name="fy" defaultValue={new Date().getFullYear()} className="rounded border-0 px-2 py-1.5">{[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}年</option>)}</select>
          <select name="fm" defaultValue={new Date().getMonth() + 1} className="rounded border-0 px-2 py-1.5">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}</select>
          <span className="text-white">〜</span>
          <select name="ty" defaultValue={new Date().getFullYear()} className="rounded border-0 px-2 py-1.5">{[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}年</option>)}</select>
          <select name="tm" defaultValue={new Date().getMonth() + 1} className="rounded border-0 px-2 py-1.5">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}</select>
          <select name="unit" className="rounded border-0 px-2 py-1.5"><option>月間</option><option>週間</option><option>日間</option></select>
          <button className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">🔍 表示</button>
        </form>
      </div>
      <div className="flex justify-end gap-2 text-xs">
        <a href="/kanri/analytics/sales/export" className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">売上集計CSV</a>
        <a href="/kanri/analytics/sales-detail/export" className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">売上分析 明細CSV</a>
      </div>
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
