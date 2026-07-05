import Link from "next/link";
import { notFound } from "next/navigation";
import { getEstimate, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { createMemorialFromEstimate, createInvoiceFromEstimate, createPurchaseOrdersFromEstimate } from "@/lib/kanri/actions";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

function fmtd(iso?: string) { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }
function fmtdt(iso?: string) { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; return `${fmtd(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export default async function EstimateDetail({ params }: Params) {
  const { id } = await params;
  const e = await getEstimate(id);
  if (!e) notFound();
  const items = e.items ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{e.title || "見積"}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/kanri/estimates" className="rounded border px-3 py-1.5">一覧へ</Link>
          <Link href={`/kanri/estimates/${id}/edit`} className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">編集</Link>
          <a href={`/kanri/estimates/${id}/print`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">見積書PDF</a>
          <form action={createInvoiceFromEstimate}><input type="hidden" name="id" value={id} /><button className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">請求書を作成</button></form>
          <form action={createPurchaseOrdersFromEstimate}><input type="hidden" name="id" value={id} /><button className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">発注書を作成</button></form>
          {e.memorialId ? (
            <Link href={`/admin/ceremonies/${e.memorialId}`} className="rounded bg-green-600 px-3 py-1.5 text-white">訃報案内を開く</Link>
          ) : (
            <form action={createMemorialFromEstimate}>
              <input type="hidden" name="id" value={id} />
              <button className="rounded bg-[#1aa39a] px-3 py-1.5 text-white">訃報案内を作成</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="故人情報">
          <Row label="氏名">{deceasedFullName(e) || "—"}</Row>
          <Row label="カナ">{[e.deceased.lastNameKana, e.deceased.firstNameKana].filter(Boolean).join(" ") || "—"}</Row>
          <Row label="性別">{e.deceased.gender ?? "—"}</Row>
          <Row label="享年">{e.deceased.age ?? "—"}</Row>
          <Row label="没日">{fmtd(e.deceased.deathDate)}</Row>
        </Section>
        <Section title="喪主情報">
          <Row label="氏名">{mournerFullName(e) || "—"}</Row>
          <Row label="続柄">{e.mourner.relation ?? "—"}</Row>
          <Row label="電話">{e.mourner.phone ?? "—"}</Row>
          <Row label="住所">{[e.mourner.postcode ? `〒${e.mourner.postcode}` : "", e.mourner.prefecture, e.mourner.addressCity, e.mourner.addressStreet, e.mourner.addressBuilding].filter(Boolean).join(" ") || "—"}</Row>
        </Section>
      </div>

      <Section title="日程・会場">
        <Row label="宗教・宗旨">{e.religion ?? "—"}</Row>
        <Row label="通夜">{fmtdt(e.wakeAt)}</Row>
        <Row label="葬儀・告別式">{fmtdt(e.funeralAt)}</Row>
        <Row label="式場">{e.venueName ?? "—"}{e.venueAddress ? `（${e.venueAddress}）` : ""}</Row>
        <Row label="火葬場">{e.crematoriumName ?? "—"}</Row>
      </Section>

      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#1aa39a]">明細</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs text-gray-500"><tr>{["品名", "単価", "数量", "税率", "金額"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {items.length === 0 ? <tr><td colSpan={5} className="px-2 py-6 text-center text-gray-400">明細なし</td></tr> :
                items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2">{it.name}{it.lineKind === "discount" && <span className="ml-1 text-xs text-gray-400">(値引)</span>}</td>
                    <td className="px-2 py-2">{it.unitPrice.toLocaleString()}円</td>
                    <td className="px-2 py-2">{it.quantity}</td>
                    <td className="px-2 py-2">{Math.round(it.taxRate * 100)}%</td>
                    <td className="px-2 py-2 whitespace-nowrap">{it.amount.toLocaleString()}円</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-gray-600"><span>小計（税抜）</span><span>{e.subtotal.toLocaleString()}円</span></div>
          <div className="flex justify-between text-gray-600"><span>値引</span><span>-{e.discountTotal.toLocaleString()}円</span></div>
          <div className="flex justify-between text-gray-600"><span>消費税</span><span>{e.taxTotal.toLocaleString()}円</span></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>合計（税込）</span><span>{e.total.toLocaleString()}円</span></div>
          {e.advancePayment > 0 && <div className="flex justify-between text-gray-600"><span>前受金</span><span>{e.advancePayment.toLocaleString()}円</span></div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-5 shadow-sm"><p className="mb-3 font-bold text-[#1aa39a]">{title}</p><div className="divide-y">{children}</div></div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex gap-4 py-2"><span className="w-28 shrink-0 text-sm text-gray-500">{label}</span><span className="text-sm">{children}</span></div>;
}
