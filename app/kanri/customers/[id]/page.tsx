import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listCustomerNotes, findRelatedCustomers, type Customer } from "@/lib/kanri/data";
import { addCustomerNote, deleteCustomerNote, deleteCustomer } from "@/lib/kanri/actions";
import { listEstimatesByCustomer, deceasedFullName } from "@/lib/kanri/estimates";
import { listInvoicesByCustomer } from "@/lib/kanri/invoices";
import { listRelatedCustomers } from "@/lib/kanri/related";
import { RelatedCustomers } from "@/components/kanri/RelatedCustomers";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = [
  { key: "customer", label: "顧客" },
  { key: "history", label: "対応履歴" },
  { key: "contract", label: "契約情報" },
  { key: "related", label: "関連顧客" },
  { key: "files", label: "顧客別ファイル" },
  { key: "events", label: "イベント" },
];

function fmt(iso?: string): string { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; const w = ["日","月","火","水","木","金","土"][d.getDay()]; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function fmtd(iso?: string): string { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function CustomerDetail({ params, searchParams }: Params) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "customer";
  const c = await getCustomer(id);
  if (!c) notFound();
  const estimates = active === "contract" ? await listEstimatesByCustomer(id) : [];
  const invoices = active === "contract" ? await listInvoicesByCustomer(id) : [];
  const notes = active === "history" ? await listCustomerNotes(id) : [];
  const related = active === "related" ? await findRelatedCustomers(c) : null;
  const relatedLinks = active === "related" ? await listRelatedCustomers(id) : [];
  const addr = [c.postcode ? `〒${c.postcode}` : "", c.prefectureCode, c.addressCity, c.addressStreet, c.addressBuilding].filter(Boolean).join(" ");

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">顧客</h1></div>

      {/* タブ */}
      <div className="mb-4 flex flex-wrap gap-1 border-b bg-white px-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/kanri/customers/${id}?tab=${t.key}`}
            className={"px-4 py-2.5 text-sm " + (active === t.key ? "border-b-2 border-[#1aa39a] font-medium text-[#1aa39a]" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </Link>
        ))}
      </div>

      {active === "customer" && (
        <div className="space-y-4">
          {/* 基本情報 */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold text-[#1aa39a]">基本情報</p>
              <div className="flex gap-2 text-sm">
                <Link href={`/kanri/customers/${id}/edit`} className="rounded border border-[#1aa39a] px-3 py-1 text-[#1aa39a]">✎ 編集</Link>
                <form action={deleteCustomer}><input type="hidden" name="id" value={id} /><button className="rounded border border-red-400 px-3 py-1 text-red-500">× 削除</button></form>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Cell label="氏名"><div className="text-xs text-gray-400">{[c.lastNameKana, c.firstNameKana].filter(Boolean).join(" ")}</div>{c.lastName} {c.firstName ?? ""}</Cell>
              <Cell label="ステータス">{c.status ?? "—"}</Cell>
              <Cell label="流入経路">{c.inflow ?? "未設定"}</Cell>
              <Cell label="顧客担当">{c.staffName ?? "—"}</Cell>
              <Cell label="お問い合わせ（登録）日時">{fmt(c.createdAt)}</Cell>
              <Cell label="性別">{c.gender ?? "—"}</Cell>
              <Cell label="生年月日">{c.birthDate ?? "—"}</Cell>
              <Cell label="自宅番号">{c.telephoneNumber ?? "—"}</Cell>
              <Cell label="携帯番号">{c.mobileNumber ?? "—"}{c.availableSmsAutoSent && <span className="ml-1 rounded bg-[#e6f6f4] px-1.5 py-0.5 text-[10px] text-[#1aa39a]">SMS自動配信対象</span>}</Cell>
              <Cell label="FAX番号">{c.faxNumber ?? "—"}</Cell>
              <Cell label="メールアドレス">{c.email ?? "—"}{c.availableDmSend && <span className="ml-1 rounded bg-[#eef4ff] px-1.5 py-0.5 text-[10px] text-[#4f7cff]">DM配信対象</span>}</Cell>
              <Cell label="住所">{addr || "—"}</Cell>
              <Cell label="その他備考">{c.note ?? "—"}</Cell>
              <Cell label="問い合わせ理由">{c.reason ?? "—"}</Cell>
              <Cell label="顧客番号">{c.customerNo ?? "—"}</Cell>
            </div>
            <div className="mt-4 flex items-center gap-3 border-t pt-3 text-sm">
              <span className="text-gray-500">マイページ</span>
              <span className="text-gray-400">未作成</span>
              <Link href={`/kanri/customers/${id}?tab=contract`} className="rounded bg-[#eef4ff] px-3 py-1 text-xs text-[#4f7cff]">見積・契約から作成</Link>
            </div>
          </div>

          {/* 会員管理 */}
          <Panel title="会員管理" cols={["入会日", "会員種別", "ステータス", "入会者"]} />
          {/* 葬家（新規作成は見積・施行フローへ） */}
          <Panel title="葬家" cols={["氏名", "続柄", "施行番号", "葬儀日"]} newHref={`/kanri/estimates/new?customer_id=${id}`} />
        </div>
      )}

      {active === "history" && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="mb-4 font-bold text-gray-800">対応履歴</p>
          <form action={addCustomerNote} className="mb-6 max-w-3xl text-sm">
            <input type="hidden" name="customer_id" value={id} />
            <p className="mb-1 text-gray-600">引継ぎ</p>
            <div className="mb-4 flex gap-6">
              <label className="flex items-center gap-1"><input type="radio" name="kind" value="不要" defaultChecked /> 不要</label>
              <label className="flex items-center gap-1"><input type="radio" name="kind" value="必要" /> 必要</label>
            </div>
            <p className="mb-1 text-gray-600">メッセージ</p>
            <textarea name="body" required rows={4} className="mb-3 w-full rounded border border-gray-300 px-3 py-2" />
            <button className="rounded bg-[#2c8c6f] px-5 py-2 text-white">登録する</button>
          </form>

          <p className="mb-2 font-bold text-gray-800">一覧</p>
          {notes.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">対応履歴はまだありません。</p> : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["登録日時", "引継ぎ", "メッセージ", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{notes.map((n) => {
                const need = n.kind === "必要";
                return (
                  <tr key={n.id}>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{fmt(n.createdAt)}<br />{n.createdBy ?? ""}</td>
                    <td className="px-3 py-3"><span className={"rounded px-2 py-0.5 text-xs " + (need ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-600")}>{n.kind ?? "不要"}</span></td>
                    <td className="px-3 py-3">{n.body}</td>
                    <td className="px-3 py-3 text-right"><form action={deleteCustomerNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="customer_id" value={id} /><button className="rounded bg-red-500 px-2 py-1 text-xs text-white">削除</button></form></td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      )}

      {active === "contract" && (
        <div className="space-y-4">
          {/* 見積もり（最新10件） */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><p className="font-bold text-gray-800">見積もり（最新10件）</p><Link href="/kanri/estimates" className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">一覧</Link></div>
            {estimates.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">見積もりはありません。</p> : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["件名", "見積日", "合計金額", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y">{estimates.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-3">{e.title || deceasedFullName(e) || "（無題）"}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtd(e.estimateOn)}</td>
                    <td className="px-3 py-3">{e.total.toLocaleString()}円</td>
                    <td className="px-3 py-3 text-right"><div className="flex justify-end gap-2">
                      <a href={`/kanri/estimates/${e.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-500">🖨 見積書</a>
                      <Link href={`/kanri/estimates/${e.id}`} className="rounded border border-green-500 px-2 py-1 text-xs text-green-600">✎ 編集</Link>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* 請求書（最新10件） */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><p className="font-bold text-gray-800">請求書（最新10件）</p><Link href="/kanri/billing" className="rounded border border-blue-400 px-3 py-1 text-xs text-blue-500">一覧</Link></div>
            {invoices.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">請求書はありません。</p> : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["請求先名(氏)", "件名", "請求日", "請求金額", "入金", "残高", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y">{invoices.map((iv) => (
                  <tr key={iv.id}>
                    <td className="px-3 py-3">{iv.mournerName ?? "—"}</td>
                    <td className="px-3 py-3">{iv.title ?? "—"}</td>
                    <td className="px-3 py-3 text-gray-500">{fmtd(iv.billedOn)}</td>
                    <td className="px-3 py-3">{iv.total.toLocaleString()}円</td>
                    <td className="px-3 py-3">{iv.paidTotal.toLocaleString()}円</td>
                    <td className="px-3 py-3">{(iv.total - iv.paidTotal).toLocaleString()}円</td>
                    <td className="px-3 py-3 text-right"><div className="flex justify-end gap-2">
                      <a href={`/kanri/billing/${iv.id}/print`} target="_blank" rel="noopener noreferrer" className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-500">🖨 請求書</a>
                      <Link href={`/kanri/billing/${iv.id}`} className="rounded border border-green-500 px-2 py-1 text-xs text-green-600">✎ 編集</Link>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          {/* 関連請求書 */}
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-gray-800">関連請求書</p>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["請求先名(氏)", "件名", "請求日", "請求金額", "入金", "残高"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody><tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">関連請求書はありません。</td></tr></tbody>
            </table>
          </div>
        </div>
      )}

      {active === "related" && related && (
        <div className="space-y-4">
          <RelatedCustomers customerId={id} links={relatedLinks} />
          <RelatedCard title="電話番号が一致する顧客" list={related.byPhone} />
          <RelatedCard title="携帯番号が一致する顧客" list={related.byMobile} />
          <RelatedCard title="住所が一致する顧客" list={related.byAddress} />
          <RelatedCard title="会員番号が一致する顧客" list={[]} />
        </div>
      )}
      {active === "files" && <Empty>顧客別ファイルはありません。</Empty>}
      {active === "events" && <Empty>参加イベントはありません。</Empty>}

      <div className="mt-6"><Link href="/kanri/customers" className="rounded border bg-white px-6 py-2.5 text-sm shadow-sm">一覧に戻る</Link></div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-[110px]"><p className="text-xs text-gray-400">{label}</p><div className="mt-0.5 text-sm">{children}</div></div>;
}
function Panel({ title, cols, newHref }: { title: string; cols: string[]; newHref?: string }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between"><p className="font-bold text-[#1aa39a]">{title}</p>
        {newHref
          ? <Link href={newHref} className="rounded border border-[#1aa39a] px-3 py-1 text-xs text-[#1aa39a]">＋ 新規作成</Link>
          : <button className="rounded border border-[#1aa39a] px-3 py-1 text-xs text-[#1aa39a]">＋ 新規作成</button>}
      </div>
      <table className="w-full text-left text-sm"><thead className="border-b text-xs text-gray-500"><tr>{cols.map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody><tr><td colSpan={cols.length} className="px-2 py-6 text-center text-sm text-gray-400">登録されていません。</td></tr></tbody></table>
    </div>
  );
}
function RelTable({ cols, rows }: { cols: string[]; rows: Customer[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{cols.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y">{rows.length === 0
        ? <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-gray-400">該当なし</td></tr>
        : rows.map((r) => (<tr key={r.id}><td className="px-3 py-3"><Link href={`/kanri/customers/${r.id}`} className="text-[#1aa39a] underline">{r.lastName} {r.firstName ?? ""}</Link></td>{cols.length > 1 && <td className="px-3 py-3 text-gray-500">—</td>}</tr>))}
      </tbody>
    </table>
  );
}
function RelatedCard({ title, list }: { title: string; list: Customer[] }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-3 font-bold text-gray-800">{title}</p>
      <RelTable cols={["氏名"]} rows={list} />
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm">{children}</div>;
}
