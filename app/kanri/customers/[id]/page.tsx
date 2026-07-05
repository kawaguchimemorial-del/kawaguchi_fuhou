import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, listCustomerNotes } from "@/lib/kanri/data";
import { addCustomerNote, deleteCustomerNote } from "@/lib/kanri/actions";
import { listEstimatesByCustomer, deceasedFullName } from "@/lib/kanri/estimates";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = [
  { key: "basic", label: "基本情報" },
  { key: "related", label: "関連顧客" },
  { key: "contract", label: "契約情報" },
  { key: "history", label: "対応履歴" },
  { key: "family", label: "葬家" },
];

function fmt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtd(iso?: string): string { if (!iso) return "—"; const d = new Date(iso); if (isNaN(d.getTime())) return "—"; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function CustomerDetail({ params, searchParams }: Params) {
  const { id } = await params;
  const { tab } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab! : "basic";
  const c = await getCustomer(id);
  if (!c) notFound();
  const estimates = active === "contract" ? await listEstimatesByCustomer(id) : [];
  const notes = active === "history" ? await listCustomerNotes(id) : [];
  const addr = [c.prefectureCode, c.addressCity, c.addressStreet, c.addressBuilding].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{c.lastName} {c.firstName ?? ""} <span className="ml-2 text-sm font-normal text-gray-500">様</span></h1>
        <div className="flex gap-2 text-sm">
          <Link href="/kanri/customers" className="rounded border px-3 py-1.5">一覧へ</Link>
          <Link href={`/kanri/estimates/new?customer_id=${c.id}`} className="rounded bg-[#1aa39a] px-3 py-1.5 text-white">見積を作成</Link>
        </div>
      </div>

      {/* タブ */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <Link key={t.key} href={`/kanri/customers/${id}?tab=${t.key}`}
            className={"px-4 py-2 text-sm " + (active === t.key ? "border-b-2 border-[#1aa39a] font-medium text-[#1aa39a]" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </Link>
        ))}
      </div>

      {active === "basic" && (
        <>
          <Section title="基本情報">
            <Row label="顧客番号">{c.customerNo ?? "—"}</Row>
            <Row label="氏名">{c.lastName} {c.firstName ?? ""}</Row>
            <Row label="カナ">{[c.lastNameKana, c.firstNameKana].filter(Boolean).join(" ") || "—"}</Row>
            <Row label="ステータス">{c.status ?? "—"}</Row>
            <Row label="流入経路">{c.inflow ?? "—"}</Row>
            <Row label="顧客担当">{c.staffName ?? "—"}</Row>
            <Row label="性別">{c.gender ?? "—"}</Row>
            <Row label="生年月日">{c.birthDate ?? "—"}</Row>
            <Row label="顧客ランク">{c.rank ?? "—"}</Row>
            <Row label="登録日時">{fmt(c.createdAt)}</Row>
          </Section>
          <Section title="連絡先">
            <Row label="自宅番号">{c.telephoneNumber ?? "—"}</Row>
            <Row label="携帯番号">{c.mobileNumber ?? "—"}</Row>
            <Row label="FAX番号">{c.faxNumber ?? "—"}</Row>
            <Row label="メールアドレス">{c.email ?? "—"}</Row>
            <Row label="住所">{c.postcode ? `〒${c.postcode} ` : ""}{addr || "—"}</Row>
          </Section>
          {(c.note || c.reason) && (
            <Section title="備考">
              {c.reason && <Row label="問い合わせ理由"><span className="whitespace-pre-wrap">{c.reason}</span></Row>}
              {c.note && <Row label="その他備考"><span className="whitespace-pre-wrap">{c.note}</span></Row>}
            </Section>
          )}
        </>
      )}

      {active === "related" && (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm">関連顧客は登録されていません。</div>
      )}

      {active === "contract" && (
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-[#1aa39a]">契約情報（見積・葬儀）</p>
            <Link href={`/kanri/estimates/new?customer_id=${id}`} className="rounded border border-[#1aa39a] px-3 py-1.5 text-xs text-[#1aa39a]">見積を作成</Link>
          </div>
          {estimates.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">見積・契約はありません。</p> : (
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-gray-500"><tr>{["件名", "故人", "合計", "見積日", "訃報連携"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {estimates.map((e) => (
                  <tr key={e.id}>
                    <td className="px-2 py-2"><Link href={`/kanri/estimates/${e.id}`} className="text-[#1aa39a] underline">{e.title || "（無題）"}</Link></td>
                    <td className="px-2 py-2">{deceasedFullName(e) || "—"}</td>
                    <td className="px-2 py-2">{e.total.toLocaleString()}円</td>
                    <td className="px-2 py-2">{fmtd(e.estimateOn)}</td>
                    <td className="px-2 py-2">{e.memorialId ? <span className="text-green-600 text-xs">連携済</span> : <span className="text-gray-400 text-xs">未</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {active === "history" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-[#1aa39a]">対応履歴を追加</p>
            <form action={addCustomerNote} className="flex flex-wrap items-end gap-3 text-sm">
              <input type="hidden" name="customer_id" value={id} />
              <div>
                <label className="block text-xs text-gray-500">種別</label>
                <select name="kind" className="mt-1 rounded border px-3 py-2">
                  <option value="電話">電話</option><option value="来店">来店</option><option value="メール">メール</option><option value="訪問">訪問</option><option value="その他">その他</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500">内容 <span className="text-red-500">必須</span></label>
                <input name="body" required className="mt-1 w-full rounded border px-3 py-2" placeholder="対応内容を入力" />
              </div>
              <button className="rounded bg-[#1aa39a] px-4 py-2 text-white">追加</button>
            </form>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="mb-3 font-bold text-[#1aa39a]">履歴</p>
            {notes.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">対応履歴はまだありません。</p> : (
              <ul className="divide-y">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-3">
                    <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{n.kind ?? "—"}</span>
                    <div className="flex-1">
                      <p className="text-sm">{n.body}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{fmt(n.createdAt)} ・ {n.createdBy ?? ""}</p>
                    </div>
                    <form action={deleteCustomerNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="customer_id" value={id} /><button className="text-xs text-red-400 hover:underline">削除</button></form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {active === "family" && (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-400 shadow-sm">葬家情報は登録されていません。見積作成時に故人・喪主を登録すると葬家として管理されます。</div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg bg-white p-5 shadow-sm"><p className="mb-3 font-bold text-[#1aa39a]">{title}</p><div className="divide-y">{children}</div></div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex gap-4 py-2"><span className="w-32 shrink-0 text-sm text-gray-500">{label}</span><span className="text-sm">{children}</span></div>;
}
