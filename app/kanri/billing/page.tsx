import Link from "next/link";
import { listInvoices } from "@/lib/kanri/invoices";
import { deleteInvoice } from "@/lib/kanri/actions";

export const metadata = { title: "請求書" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ id?: string; pno?: string; mourner?: string; target?: string; bill_to?: string; title?: string; from?: string; to?: string; p?: string }> };
const PAGE_SIZE = 200;

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function BillingPage({ searchParams }: SP) {
  const sp = await searchParams;
  let invoices = await listInvoices();
  if (sp.id) invoices = invoices.filter((i) => (i.invoiceNo ?? "").includes(sp.id!));
  if (sp.pno) invoices = invoices.filter((i) => (i.constructionNo ?? "").includes(sp.pno!));
  if (sp.mourner) invoices = invoices.filter((i) => (i.mournerName ?? i.customerName ?? "").includes(sp.mourner!));
  if (sp.target) invoices = invoices.filter((i) => (i.deceasedName ?? "").includes(sp.target!));
  if (sp.bill_to) invoices = invoices.filter((i) => (i.invoiceTargetName ?? "").includes(sp.bill_to!));
  if (sp.title) invoices = invoices.filter((i) => (i.title ?? "").includes(sp.title!));
  if (sp.from) invoices = invoices.filter((i) => i.billedOn && i.billedOn >= sp.from!);
  if (sp.to) invoices = invoices.filter((i) => i.billedOn && i.billedOn <= sp.to!);

  // 200件ページネーション
  const page = Math.max(1, Number(sp.p ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const totalCount = invoices.length;
  const paged = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qsBase = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "p" && v) as [string, string][]).toString();
  const pageHref = (n: number) => `/kanri/billing?${qsBase ? qsBase + "&" : ""}p=${n}`;

  const cols = ["ID", "顧客", "対象者", "件名", "請求日", "合計金額", "売上区分", "施行番号", "請求先", "最終更新者", "操作"];

  return (
    <div>
      {/* 緑ヘッダー＋右上ボタン群 */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">請求書</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/kanri/billing/invoices-export" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">請求書CSVダウンロード</a>
          <Link href="/kanri/billing/new" className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">請求書追加</Link>
          <Link href="/kanri/billing/import" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">請求書CSVインポート</Link>
        </div>
      </div>

      {/* 検索（実画面準拠） */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500">請求日</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" name="from" defaultValue={sp.from ?? ""} className="w-full rounded border px-3 py-2" />
              <span className="text-gray-400">〜</span>
              <input type="date" name="to" defaultValue={sp.to ?? ""} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
          <div><label className="block text-xs text-gray-500">請求書ID</label><input name="id" defaultValue={sp.id ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">施行番号</label><input name="pno" defaultValue={sp.pno ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">喪主氏名（漢字orカナ）</label><input name="mourner" defaultValue={sp.mourner ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">対象者氏名（漢字orカナ）</label><input name="target" defaultValue={sp.target ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">請求先名</label><input name="bill_to" defaultValue={sp.bill_to ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">件名</label><input name="title" defaultValue={sp.title ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
        </div>
        <button className="mt-4 rounded bg-[#2c8c6f] px-6 py-2 text-white">🔍 検索</button>
      </form>

      {/* 一覧（実画面準拠の列構成） */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">ヒット件数: {totalCount} 件（{(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, totalCount)}件目を表示）</span></p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h) => <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {paged.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-gray-400">請求書がありません。</td></tr> :
                paged.map((iv) => (
                  <tr key={iv.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{iv.invoiceNo ?? iv.id.slice(0, 8)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.customerId ? <Link href={`/kanri/customers/${iv.customerId}`} className="text-[#1aa39a] underline">{iv.customerName ?? "—"}</Link> : (iv.customerName ?? "—")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.deceasedName ?? ""}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate" title={iv.title ?? ""}>{iv.title ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(iv.billedOn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{iv.total.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.saleCategory ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.constructionNo ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.invoiceTargetName ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{iv.staffName ?? ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Link href={`/kanri/billing/${iv.id}`} className="rounded border border-blue-400 px-2 py-1 text-[11px] text-blue-500">詳細</Link>
                        <Link href={`/kanri/billing/${iv.id}/edit`} className="rounded border border-[#2c8c6f] px-2 py-1 text-[11px] text-[#2c8c6f]">編集</Link>
                        <a href={`/kanri/billing/${iv.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">請求書</a>
                        {iv.paidTotal > 0 ? (
                          <a href={`/kanri/billing/${iv.id}/receipt`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">領収証</a>
                        ) : (
                          <Link href={`/kanri/billing/${iv.id}/slip/new`} className="rounded border border-[#f2683f] bg-[#fff4f0] px-2 py-1 text-[11px] text-[#f2683f]">入金伝票発行</Link>
                        )}
                        <form action={deleteInvoice}><input type="hidden" name="id" value={iv.id} /><button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {/* ページネーション（200件ごと） */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t px-4 py-3 text-sm">
            {page > 1 && <Link href={pageHref(page - 1)} className="rounded border px-3 py-1.5 text-gray-600">‹ 前へ</Link>}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={pageHref(n)} className={"rounded px-3 py-1.5 " + (n === page ? "bg-[#2c8c6f] text-white" : "border text-gray-600")}>{n}</Link>
            ))}
            {page < totalPages && <Link href={pageHref(page + 1)} className="rounded border px-3 py-1.5 text-gray-600">次へ ›</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
