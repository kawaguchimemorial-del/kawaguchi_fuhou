import Link from "next/link";
import { listEstimates, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";
import { createInvoiceFromEstimate, createPurchaseOrdersFromEstimate, deleteEstimate } from "@/lib/kanri/actions";
import { ConfirmSubmit } from "./ConfirmSubmit";

export const metadata = { title: "見積もり" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ id?: string; pno?: string; mourner?: string; target?: string; title?: string; from?: string; to?: string; kind?: string; p?: string }> };
const PAGE_SIZE = 200;

function fmt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function EstimatesPage({ searchParams }: SP) {
  const sp = await searchParams;
  // 葬家(施行)データは見積一覧から分離
  let rows = (await listEstimates()).filter((e) => e.kind !== "funeral_target");
  if (sp.kind) rows = rows.filter((e) => e.kind === sp.kind);
  if (sp.id) rows = rows.filter((e) => (e.estimateNo ?? "").includes(sp.id!));
  if (sp.pno) rows = rows.filter((e) => (e.estimateNo ?? "").includes(sp.pno!));
  if (sp.mourner) rows = rows.filter((e) => (mournerFullName(e) || e.customerName || "").includes(sp.mourner!));
  if (sp.target) rows = rows.filter((e) => deceasedFullName(e).includes(sp.target!));
  if (sp.title) rows = rows.filter((e) => (e.title ?? "").includes(sp.title!));
  if (sp.from) rows = rows.filter((e) => e.estimateOn && e.estimateOn >= sp.from!);
  if (sp.to) rows = rows.filter((e) => e.estimateOn && e.estimateOn <= sp.to!);
  // 見積日の降順（未設定は末尾）
  rows.sort((a, b) => String(b.estimateOn ?? "").localeCompare(String(a.estimateOn ?? "")));

  // 200件ページネーション
  const page = Math.max(1, Number(sp.p ?? 1) || 1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const totalCount = rows.length;
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qsBase = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "p" && v) as [string, string][]).toString();
  const pageHref = (n: number) => `/kanri/estimates?${qsBase ? qsBase + "&" : ""}p=${n}`;

  const cols = ["ID", "顧客", "対象者", "件名", "合計金額", "見積日", "施行番号", "最終更新者", "操作"];

  return (
    <div>
      {/* 緑ヘッダー */}
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">見積もり</h1>
        <Link href="/kanri/estimates/new" className="rounded bg-white px-3 py-1.5 text-xs font-medium text-[#2c8c6f]">＋ 見積作成</Link>
      </div>

      {/* 検索（実画面準拠） */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs text-gray-500">見積日</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" name="from" defaultValue={sp.from ?? ""} className="w-full rounded border px-3 py-2" />
              <span className="text-gray-400">〜</span>
              <input type="date" name="to" defaultValue={sp.to ?? ""} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
          <div><label className="block text-xs text-gray-500">見積書ID</label><input name="id" defaultValue={sp.id ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">施行番号</label><input name="pno" defaultValue={sp.pno ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">喪主氏名（漢字orカナ）</label><input name="mourner" defaultValue={sp.mourner ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">対象者氏名（漢字orカナ）</label><input name="target" defaultValue={sp.target ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div><label className="block text-xs text-gray-500">件名</label><input name="title" defaultValue={sp.title ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div>
            <label className="block text-xs text-gray-500">種別</label>
            <select name="kind" defaultValue={sp.kind ?? ""} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">すべて</option><option value="funeral">葬儀見積</option><option value="pre">事前見積</option>
            </select>
          </div>
        </div>
        <button className="mt-4 rounded bg-[#2c8c6f] px-6 py-2 text-white">🔍 検索</button>
      </form>

      {/* 一覧（実画面準拠: 顧客リンク付き） */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">ヒット件数: {totalCount} 件（{(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, totalCount)}件目を表示）</span></p></div>
        {/* スマホ用カードリスト（lg未満） */}
        <ul className="divide-y lg:hidden">
          {paged.length === 0 ? <li className="px-4 py-10 text-center text-sm text-gray-400">見積がありません。</li> :
            paged.map((e) => (
              <li key={e.id} className="p-4 text-base">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/kanri/estimates/${e.id}`} className="min-w-0 flex-1 font-bold leading-snug text-[#1aa39a] break-words">{e.title || "（無題）"}</Link>
                  <span className="shrink-0 font-bold tabular-nums">{e.total.toLocaleString()}円</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {e.customerId ? <Link href={`/kanri/customers/${e.customerId}`} className="text-[#1aa39a] underline">{e.customerName ?? mournerFullName(e) ?? "—"}</Link> : (e.customerName ?? mournerFullName(e) ?? "—")}
                  <span className="text-gray-400"> / </span>{deceasedFullName(e) || "対象者未設定"}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-400">
                  <div><dt className="inline">見積日 </dt><dd className="inline">{fmt(e.estimateOn) || "—"}</dd></div>
                  <div><dt className="inline">施行番号 </dt><dd className="inline">{e.estimateNo || "—"}</dd></div>
                  <div><dt className="inline">ID </dt><dd className="inline font-mono">{e.sourceId ?? e.estimateNo ?? e.id.slice(0, 8)}</dd></div>
                  <div><dt className="inline">担当 </dt><dd className="inline">{e.staffName || "—"}</dd></div>
                </dl>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`/kanri/estimates/${e.id}`} className="grid min-h-[44px] flex-1 place-items-center rounded-lg bg-gray-100 text-base font-medium text-gray-700">詳細</Link>
                  <a href={`/kanri/estimates/${e.id}/print`} target="_blank" rel="noopener noreferrer" className="grid min-h-[44px] flex-1 place-items-center rounded-lg bg-[#e6f6f4] text-base font-medium text-[#1aa39a]">見積書</a>
                  <details className="relative shrink-0">
                    <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-lg border text-xl text-gray-500 [&::-webkit-details-marker]:hidden">⋯</summary>
                    <div className="mt-2 overflow-hidden rounded-xl border bg-white shadow-sm">
                      <ConfirmSubmit action={createInvoiceFromEstimate} id={e.id} confirm="この見積から請求書を作成します。よろしいですか？" className="flex min-h-[44px] w-full items-center px-4 text-base text-[#4f7cff]">請求書を作成</ConfirmSubmit>
                      <ConfirmSubmit action={createPurchaseOrdersFromEstimate} id={e.id} confirm="この見積から発注書を作成します。よろしいですか？" className="flex min-h-[44px] w-full items-center px-4 text-base text-[#e8613c]">発注書を作成</ConfirmSubmit>
                      <div className="px-4 pt-2 pb-1 text-xs text-gray-400">訃報案内</div>
                      <Link href={`/fuhou/ceremonies/new?type=obituary&from_estimate=${e.id}`} className="flex min-h-[44px] items-center px-4 text-base text-[#9b2fae]">訃報を作成</Link>
                      <Link href={`/fuhou/ceremonies/new?type=obituary_venue&from_estimate=${e.id}`} className="flex min-h-[44px] items-center px-4 text-base text-[#9b2fae]">訃報＋オンライン式場</Link>
                      <div className="mt-1 border-t pt-1">
                        <ConfirmSubmit action={deleteEstimate} id={e.id} confirm="この見積を削除します。取り消せません。よろしいですか？" className="flex min-h-[44px] w-full items-center px-4 text-base text-red-600">この見積を削除</ConfirmSubmit>
                      </div>
                    </div>
                  </details>
                </div>
              </li>
            ))}
        </ul>
        {/* PC用テーブル（lg以上・現行温存） */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h) => <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {paged.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-gray-400">見積がありません。</td></tr> :
                paged.map((e) => (
                  <tr key={e.id} className="align-middle hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">{e.sourceId ?? e.estimateNo ?? e.id.slice(0, 8)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.customerId ? <Link href={`/kanri/customers/${e.customerId}`} className="text-[#1aa39a] underline">{e.customerName ?? mournerFullName(e) ?? "—"}</Link> : (e.customerName ?? mournerFullName(e) ?? "—")}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{deceasedFullName(e) || ""}</td>
                    <td className="px-3 py-2 max-w-[280px] truncate" title={e.title ?? ""}><Link href={`/kanri/estimates/${e.id}`} className="text-[#1aa39a] underline">{e.title || "（無題）"}</Link></td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">{e.total.toLocaleString()}円</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(e.estimateOn)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.estimateNo ?? ""}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{e.staffName ?? ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Link href={`/kanri/estimates/${e.id}`} className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">詳細</Link>
                        <a href={`/kanri/estimates/${e.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded bg-[#e6f6f4] px-2 py-1 text-[11px] text-[#1aa39a]">見積書</a>
                        <form action={createInvoiceFromEstimate}><input type="hidden" name="id" value={e.id} /><button className="rounded bg-[#eef4ff] px-2 py-1 text-[11px] text-[#4f7cff]">請求書</button></form>
                        <form action={createPurchaseOrdersFromEstimate}><input type="hidden" name="id" value={e.id} /><button className="rounded bg-[#fff4ec] px-2 py-1 text-[11px] text-[#e8613c]">発注書</button></form>
                        <details className="relative inline-block">
                          <summary className="cursor-pointer list-none rounded bg-[#f3e8ff] px-2 py-1 text-[11px] text-[#9b2fae] [&::-webkit-details-marker]:hidden">訃報案内 ▾</summary>
                          <div className="absolute left-0 z-20 mt-1 w-64 rounded border bg-white py-1 shadow-lg">
                            <Link href={`/fuhou/ceremonies/new?type=obituary&from_estimate=${e.id}`} className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">訃報を作成する</Link>
                            <Link href={`/fuhou/ceremonies/new?type=obituary_venue&from_estimate=${e.id}`} className="block px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">訃報＋オンライン式場を作成する</Link>
                          </div>
                        </details>
                        <form action={deleteEstimate}><input type="hidden" name="id" value={e.id} /><button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button></form>
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
