import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listCustomerNotes } from "@/lib/kanri/data";
import { addCustomerNote, deleteCustomerNote, deleteCustomer } from "@/lib/kanri/actions";
import { listEstimatesByCustomer, deceasedFullName } from "@/lib/kanri/estimates";

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
  const notes = active === "history" ? await listCustomerNotes(id) : [];
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
          {/* 葬家 */}
          <Panel title="葬家" cols={["氏名", "続柄", "施行番号", "葬儀日"]} />
        </div>
      )}

      {active === "history" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-[#1aa39a]">対応履歴を追加</p>
            <form action={addCustomerNote} className="flex flex-wrap items-end gap-3 text-sm">
              <input type="hidden" name="customer_id" value={id} />
              <div><label className="block text-xs text-gray-500">種別</label><select name="kind" className="mt-1 rounded border px-3 py-2"><option value="電話">電話</option><option value="来店">来店</option><option value="メール">メール</option><option value="訪問">訪問</option><option value="その他">その他</option></select></div>
              <div className="flex-1"><label className="block text-xs text-gray-500">内容 <span className="text-red-500">必須</span></label><input name="body" required className="mt-1 w-full rounded border px-3 py-2" placeholder="対応内容を入力" /></div>
              <button className="rounded bg-[#1aa39a] px-4 py-2 text-white">追加</button>
            </form>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-[#1aa39a]">履歴</p>
            {notes.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">対応履歴はまだありません。</p> : (
              <ul className="divide-y">{notes.map((n) => (<li key={n.id} className="flex items-start gap-3 py-3"><span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{n.kind ?? "—"}</span><div className="flex-1"><p className="text-sm">{n.body}</p><p className="mt-0.5 text-xs text-gray-400">{fmt(n.createdAt)} ・ {n.createdBy ?? ""}</p></div><form action={deleteCustomerNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="customer_id" value={id} /><button className="text-xs text-red-400 hover:underline">削除</button></form></li>))}</ul>
            )}
          </div>
        </div>
      )}

      {active === "contract" && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><p className="font-bold text-[#1aa39a]">契約情報（見積・葬儀）</p><Link href={`/kanri/estimates/new?customer_id=${id}`} className="rounded border border-[#1aa39a] px-3 py-1.5 text-xs text-[#1aa39a]">見積を作成</Link></div>
          {estimates.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">見積・契約はありません。</p> : (
            <table className="w-full text-left text-sm"><thead className="border-b text-xs text-gray-500"><tr>{["件名", "故人", "合計", "見積日", "訃報連携"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{estimates.map((e) => (<tr key={e.id}><td className="px-2 py-2"><Link href={`/kanri/estimates/${e.id}`} className="text-[#1aa39a] underline">{e.title || "（無題）"}</Link></td><td className="px-2 py-2">{deceasedFullName(e) || "—"}</td><td className="px-2 py-2">{e.total.toLocaleString()}円</td><td className="px-2 py-2">{fmtd(e.estimateOn)}</td><td className="px-2 py-2">{e.memorialId ? <span className="text-green-600 text-xs">連携済</span> : <span className="text-gray-400 text-xs">未</span>}</td></tr>))}</tbody></table>
          )}
        </div>
      )}

      {active === "related" && <Empty>関連顧客は登録されていません。</Empty>}
      {active === "files" && <Empty>顧客別ファイルはありません。</Empty>}
      {active === "events" && <Empty>参加イベントはありません。</Empty>}

      <div className="mt-6"><Link href="/kanri/customers" className="rounded border bg-white px-6 py-2.5 text-sm shadow-sm">一覧に戻る</Link></div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-[110px]"><p className="text-xs text-gray-400">{label}</p><div className="mt-0.5 text-sm">{children}</div></div>;
}
function Panel({ title, cols }: { title: string; cols: string[] }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between"><p className="font-bold text-[#1aa39a]">{title}</p><button className="rounded border border-[#1aa39a] px-3 py-1 text-xs text-[#1aa39a]">＋ 新規作成</button></div>
      <table className="w-full text-left text-sm"><thead className="border-b text-xs text-gray-500"><tr>{cols.map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
        <tbody><tr><td colSpan={cols.length} className="px-2 py-6 text-center text-sm text-gray-400">登録されていません。</td></tr></tbody></table>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm">{children}</div>;
}
