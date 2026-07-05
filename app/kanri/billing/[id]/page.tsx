import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoice, INVOICE_STATUS_LABEL } from "@/lib/kanri/invoices";
import { deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { recordPayment } from "@/lib/kanri/actions";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
function fmt(iso?: string){ if(!iso) return "—"; const d=new Date(iso); if(isNaN(d.getTime()))return "—"; return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
export default async function InvoiceDetail({ params }: Params){
  const { id } = await params;
  const res = await getInvoice(id);
  if(!res) notFound();
  const { invoice: iv, estimate: e } = res;
  const remaining = iv.total - iv.paidTotal;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">請求書詳細</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/kanri/billing" className="rounded border px-3 py-1.5">一覧へ</Link>
          {e && <Link href={`/kanri/estimates/${e.id}`} className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">見積を開く</Link>}
          <a href={`/kanri/billing/${iv.id}/receipt`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-3 py-1.5 text-[#1aa39a]">領収書PDF</a>
        </div>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm divide-y">
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">請求日</span><span className="text-sm">{fmt(iv.billedOn)}</span></div>
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">故人 / 喪主</span><span className="text-sm">{e ? `${deceasedFullName(e)} / ${mournerFullName(e)}` : "—"}</span></div>
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">請求額（税込）</span><span className="text-sm font-bold">{iv.total.toLocaleString()}円</span></div>
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">入金額</span><span className="text-sm">{iv.paidTotal.toLocaleString()}円</span></div>
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">残額</span><span className="text-sm">{remaining.toLocaleString()}円</span></div>
        <div className="flex gap-4 py-2"><span className="w-32 text-sm text-gray-500">ステータス</span><span className="text-sm">{INVOICE_STATUS_LABEL[iv.status] ?? iv.status}</span></div>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-[#1aa39a]">入金を記録</p>
        <form action={recordPayment} className="flex flex-wrap items-end gap-3 text-sm">
          <input type="hidden" name="id" value={iv.id} />
          <div><label className="block text-xs text-gray-500">入金額</label><input name="amount" type="number" defaultValue={remaining > 0 ? remaining : 0} className="mt-1 w-40 rounded border px-3 py-2" /></div>
          <button className="rounded bg-[#1aa39a] px-4 py-2 text-white">記録する</button>
        </form>
      </div>
      {e && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="mb-3 font-bold text-[#1aa39a]">請求明細（見積より）</p>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-gray-500"><tr>{["品名","金額"].map(h=><th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {(e.items ?? []).map((it,i)=>(<tr key={i}><td className="px-2 py-2">{it.name}</td><td className="px-2 py-2">{it.amount.toLocaleString()}円</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
