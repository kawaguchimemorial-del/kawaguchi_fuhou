import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}(${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params;
  const o = await getOrderDetail(id);
  if (!o) notFound();

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">供花・供物 注文詳細</h1>
        <Link href="/admin/orders" className="rounded border px-3 py-1.5 text-sm">一覧へ</Link>
      </div>

      {/* 注文商品 */}
      <div className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#9b2fae]">ご注文商品</p>
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500">
            <tr>{["商品名", "数量", "単価(税込)", "小計"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {o.items.map((it, i) => (
              <tr key={i}>
                <td className="px-2 py-2">{it.productName}</td>
                <td className="px-2 py-2">{it.quantity}</td>
                <td className="px-2 py-2">{it.unitPrice.toLocaleString()}円</td>
                <td className="px-2 py-2">{(it.unitPrice * it.quantity).toLocaleString()}円</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t"><td colSpan={3} className="px-2 py-2 text-right font-bold">合計</td><td className="px-2 py-2 font-bold">{o.total.toLocaleString()}円</td></tr>
          </tfoot>
        </table>
      </div>

      {/* 注文情報 */}
      <div className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#9b2fae]">ご注文情報</p>
        <Field label="ステータス">{o.status}</Field>
        <Field label="注文日時">{fmt(o.createdAt)}</Field>
        <Field label="お支払い方法">{o.payment}</Field>
        <Field label="対象葬儀">故 {o.deceasedName} 儀（喪主 {o.mournerName}）{o.ceremonySlug && <Link href={`/admin/ceremonies/${o.ceremonySlug}`} className="ml-2 text-[#9b2fae] underline">葬儀詳細 ›</Link>}</Field>
      </div>

      {/* 注文者情報 */}
      <div className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#9b2fae]">ご注文者情報</p>
        <Field label="お名前">{o.ordererName}{o.ordererKana ? `（${o.ordererKana}）` : ""}</Field>
        {o.company && <Field label="法人・団体名">{o.company}</Field>}
        <Field label="札名">{o.namePlate || "—"}{o.oldChar ? "（旧字体希望）" : ""}</Field>
        <Field label="郵便番号">{o.postalCode || "—"}</Field>
        <Field label="住所">{o.address || "—"}</Field>
        <Field label="電話番号">{o.phone || "—"}</Field>
        <Field label="メールアドレス">{o.email || "—"}</Field>
        <Field label="領収書宛名">{o.invoiceName || "—"}</Field>
        {o.memo && <Field label="備考">{o.memo}</Field>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b py-2 last:border-0">
      <span className="w-32 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
