import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/kanri/invoices";
import { listPaymentSlips } from "@/lib/kanri/payments";
import { deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { deletePaymentSlip } from "@/lib/kanri/actions";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function PaymentSlipManage({ params }: Params) {
  const { id } = await params;
  const res = await getInvoice(id);
  if (!res) notFound();
  const { invoice: iv, estimate: e } = res;
  const slips = await listPaymentSlips(id);
  const title = e ? `${deceasedFullName(e)}様ご葬儀` : (iv.invoiceNo ?? id.slice(0, 8));
  const mourner = e ? mournerFullName(e) : "";
  const funeralOn = e ? fmt(e.funeralAt) : "";
  const totalPaid = slips.reduce((a, sl) => a + sl.payments.reduce((b, p) => b + p.amount, 0), 0);

  const cols = ["入金先", "伝票区分", "施行番号", "喪主", "葬儀日", "売上区分", "伝票番号", "発行日", "入金日", "入金額", "入金方法", "入金種別", "操作", "領収書"];

  return (
    <div>
      {/* 緑ヘッダー */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">請求書:{title}:伝票(入金)管理</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href={`/kanri/billing/${iv.id}/edit`} className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">編集</Link>
          <a href={`/kanri/billing/${iv.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">請求書PDF</a>
          <Link href={`/kanri/billing/${iv.id}/slip/new`} className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">伝票発行</Link>
        </div>
      </div>

      {/* 履歴 */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold text-[#2c8c6f]">履歴</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h) => <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {slips.length === 0 || slips.every((sl) => sl.payments.length === 0) ? (
                <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-gray-400">入金伝票がありません。「伝票発行」から登録できます。</td></tr>
              ) : (
                slips.flatMap((sl) => sl.payments.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{i === 0 ? (sl.source ?? "—") : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{i === 0 ? (sl.slipKind ?? "—") : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{i === 0 ? (sl.performanceNo ?? "—") : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{i === 0 ? mourner : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{i === 0 ? funeralOn : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{i === 0 ? (sl.summary ?? "—") : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{i === 0 ? (sl.slipNo ?? "—") : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{i === 0 ? fmt(sl.issuedOn) : ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(p.paidOn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{p.amount.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.method ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.category ?? "—"}</td>
                    <td className="px-3 py-2">
                      {i === 0 && (
                        <form action={deletePaymentSlip}>
                          <input type="hidden" name="id" value={sl.id} />
                          <input type="hidden" name="invoice_id" value={iv.id} />
                          <button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button>
                        </form>
                      )}
                    </td>
                    <td className="px-3 py-2">{i === 0 && <a href={`/kanri/billing/${iv.id}/receipt`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">領収書</a>}</td>
                  </tr>
                )))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t bg-gray-50 font-bold">
                <td colSpan={9} className="px-3 py-3 text-right text-[#2c8c6f]">入金合計</td>
                <td className="px-3 py-3 text-right">{totalPaid.toLocaleString()}円</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/kanri/deposits" className="inline-block rounded bg-gray-200 px-5 py-2 text-sm text-gray-700 hover:bg-gray-300">入金管理一覧に戻る</Link>
      </div>
    </div>
  );
}
