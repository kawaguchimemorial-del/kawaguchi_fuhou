export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-xl font-bold">供花・供物 注文一覧</h1>
      <div className="mb-4 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
        オンラインカード決済のご注文は、注文日時より5日以内にステータス変更を行ってください。
        5日経過すると自動で売上計上されます。
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              {["喪主名", "故人名", "注文日", "ステータス", "注文者", "札名", "配送先", "支払い方法", "合計金額(税込)"].map((h) => (
                <th key={h} className="px-3 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-400">注文はまだありません（Supabase接続後に表示）。</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
