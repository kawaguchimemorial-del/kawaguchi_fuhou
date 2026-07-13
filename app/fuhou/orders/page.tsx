import { listAllOrders } from "@/lib/admin/data";
import { ClickableRow } from "@/components/admin/ClickableRow";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}(${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function OrdersPage() {
  const rows = await listAllOrders();
  const total = rows.reduce((a, r) => a + r.amountJpy, 0);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-xl font-bold">供花・供物 注文一覧</h1>
      <div className="mb-4 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
        オンラインカード決済のご注文は、注文日時より5日以内にステータス変更を行ってください。
        5日経過すると自動で売上計上されます。
      </div>
      <p className="mb-2 text-sm text-gray-600">合計 {rows.length}件 / {total.toLocaleString()}円</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              {["喪主名", "故人名", "注文日", "ステータス", "注文者", "札名", "配送先", "支払い方法", "合計金額(税込)", "操作"].map((h) => (
                <th key={h} className="px-3 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-gray-400">注文はまだありません。</td></tr>
            ) : (
              rows.map((r) => (
                <ClickableRow key={r.id} href={`/fuhou/orders/${r.id}`}>
                  <td className="px-3 py-3">{r.mournerName}</td>
                  <td className="px-3 py-3">{r.deceasedName}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.status}</td>
                  <td className="px-3 py-3">{r.ordererName}</td>
                  <td className="px-3 py-3">{r.namePlate}</td>
                  <td className="px-3 py-3 max-w-[220px] truncate" title={r.address}>{r.address}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.payment}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{r.amountJpy.toLocaleString()}円</td>
                  <td className="px-3 py-3 whitespace-nowrap"><DeleteOrderButton id={r.id} /></td>
                </ClickableRow>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
