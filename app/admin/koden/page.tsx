import { listKoden } from "@/lib/admin/data";

export default async function KodenAdminPage() {
  const rows = await listKoden();
  const total = rows.reduce((s, r) => s + r.amountJpy, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">香典決済一覧</h1>
        <div className="text-sm">
          合計：<span className="text-lg font-bold">{total.toLocaleString()}円</span>
          <span className="ml-2 text-gray-500">（{rows.length}件）</span>
          <a href="/admin/koden/export" className="ml-4 rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">
            CSVダウンロード
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              {["記帳日時", "喪主名", "故人名", "式1", "記帳者名", "お香典金額"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs">{r.registeredAt}</td>
                <td className="px-4 py-3">{r.mournerName}</td>
                <td className="px-4 py-3">{r.deceasedName}</td>
                <td className="px-4 py-3 text-xs">{r.event1}</td>
                <td className="px-4 py-3">{r.donorName}</td>
                <td className="px-4 py-3 text-right font-medium">{r.amountJpy.toLocaleString()} 円</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        ※ 香典返し（半返し）目安はCSVエクスポートに自動計算列を含めます（実装予定）。
      </p>
    </div>
  );
}
