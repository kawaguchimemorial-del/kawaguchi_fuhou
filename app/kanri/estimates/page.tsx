import Link from "next/link";
import { listEstimates, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { createInvoiceFromEstimate, createPurchaseOrdersFromEstimate } from "@/lib/kanri/actions";
import { PageHeader } from "@/components/kanri/PageHeader";

export const metadata = { title: "見積もり" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ q?: string; kind?: string }> };

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function EstimatesPage({ searchParams }: SP) {
  const { q, kind } = await searchParams;
  let rows = await listEstimates();
  if (kind) rows = rows.filter((e) => e.kind === kind);
  if (q) {
    const k = q.trim();
    rows = rows.filter((e) => [e.title, deceasedFullName(e), mournerFullName(e), e.estimateNo].filter(Boolean).some((v) => String(v).includes(k)));
  }

  return (
    <div>
      <PageHeader title="見積もり" action={{ label: "＋ 見積作成", href: "/kanri/estimates/new" }} />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm text-sm">
        <div>
          <label className="block text-xs text-gray-500">キーワード（件名/故人/喪主）</label>
          <input name="q" defaultValue={q ?? ""} className="mt-1 w-56 rounded border px-3 py-2" placeholder="検索" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">種別</label>
          <select name="kind" defaultValue={kind ?? ""} className="mt-1 rounded border px-3 py-2">
            <option value="">すべて</option><option value="funeral">葬儀見積</option><option value="pre">事前見積</option>
          </select>
        </div>
        <button className="rounded bg-gray-700 px-4 py-2 text-white">検索</button>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{["施行番号", "件名", "故人", "喪主", "種別", "合計(税込)", "見積日", "訃報", "操作"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-400">見積がありません。</td></tr> :
              rows.map((e) => (
                <tr key={e.id} className="align-middle hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{e.estimateNo ?? "—"}</td>
                  <td className="px-3 py-2"><Link href={`/kanri/estimates/${e.id}`} className="font-medium text-[#1aa39a] underline">{e.title || "（無題）"}</Link></td>
                  <td className="px-3 py-2">{deceasedFullName(e) || "—"}</td>
                  <td className="px-3 py-2">{mournerFullName(e) || "—"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{e.kind === "pre" ? "事前" : "葬儀"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{e.total.toLocaleString()}円</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(e.estimateOn)}</td>
                  <td className="px-3 py-2">{e.memorialId ? <span className="text-xs text-green-600">連携済</span> : <span className="text-xs text-gray-400">未</span>}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/kanri/estimates/${e.id}`} className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">詳細</Link>
                      <a href={`/kanri/estimates/${e.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded bg-[#e6f6f4] px-2 py-1 text-[11px] text-[#1aa39a]">見積書</a>
                      <form action={createInvoiceFromEstimate}><input type="hidden" name="id" value={e.id} /><button className="rounded bg-[#eef4ff] px-2 py-1 text-[11px] text-[#4f7cff]">請求書</button></form>
                      <form action={createPurchaseOrdersFromEstimate}><input type="hidden" name="id" value={e.id} /><button className="rounded bg-[#fff4ec] px-2 py-1 text-[11px] text-[#e8613c]">発注書</button></form>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">{rows.length} 件</p>
    </div>
  );
}
