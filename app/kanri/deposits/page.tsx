import Link from "next/link";
import { listInvoices } from "@/lib/kanri/invoices";

export const metadata = { title: "入金管理" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ unpaid?: string; q?: string }> };

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function DepositsPage({ searchParams }: SP) {
  const { unpaid, q } = await searchParams;
  let rows = await listInvoices();
  if (unpaid) rows = rows.filter((i) => i.total - i.paidTotal > 0);
  if (q) { const k = q.trim(); rows = rows.filter((i) => [i.deceasedName, i.mournerName, i.invoiceTargetName, i.customerName].filter(Boolean).some((v) => String(v).includes(k))); }

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">入金管理</h1></div>

      {/* 条件指定 */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <p className="mb-3 font-bold text-gray-700">条件指定</p>
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="block text-xs text-gray-500">請求先名（故人/喪主）</label><input name="q" defaultValue={q ?? ""} className="mt-1 w-56 rounded border px-3 py-2" placeholder="検索" /></div>
          <label className="flex items-center gap-1 pb-2 text-xs"><input type="checkbox" name="unpaid" value="1" defaultChecked={!!unpaid} /> 未入金のみ</label>
          <button className="rounded border px-5 py-2">🔍 検索</button>
        </div>
      </form>

      {/* 一覧 */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">{rows.length} 件</span></p>
          <div className="flex gap-2">
            <a href="/kanri/billing/export" className="rounded border border-[#1aa39a] px-3 py-1.5 text-xs text-[#1aa39a]">CSVダウンロード</a>
            <a href="/kanri/deposits/slips" className="rounded border border-[#1aa39a] px-3 py-1.5 text-xs text-[#1aa39a]">伝票明細CSV</a>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["請求書ID", "操作", "顧客(故人)", "請求先名", "請求日", "請求額", "入金額", "残高", "支払方法"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-400">請求書がありません。</td></tr> :
                rows.map((iv) => (
                  <tr key={iv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-[#1aa39a]">{iv.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Link href={`/kanri/billing/${iv.id}/slip/new`} className="rounded border border-[#f2683f] bg-[#fff4f0] px-2 py-1 text-[11px] text-[#f2683f]">伝票発行</Link>
                        <Link href={`/kanri/billing/${iv.id}`} className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">入金管理</Link>
                      </div>
                    </td>
                    <td className="px-3 py-2">{iv.deceasedName ?? "—"}</td>
                    <td className="px-3 py-2">{
                      // 実際に入力された請求先名を優先。区分に応じて 顧客名/喪主名 にフォールバック。
                      iv.invoiceTargetName
                      || (iv.invoiceTargetKind === "顧客" ? iv.customerName : iv.invoiceTargetKind === "喪主" ? iv.mournerName : undefined)
                      || iv.mournerName || iv.customerName || "—"
                    }</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(iv.billedOn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{iv.total.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{iv.paidTotal.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{(iv.total - iv.paidTotal).toLocaleString()}円</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{iv.paidTotal > 0 ? "オンラインカード決済" : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
