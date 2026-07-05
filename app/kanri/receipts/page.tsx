import Link from "next/link";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { KANRI_HOME_ID } from "@/lib/kanri/constants";

export const metadata = { title: "領収書" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ pno?: string; from?: string; to?: string; addressee?: string }> };

function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`; }

export default async function ReceiptsPage({ searchParams }: SP) {
  const { pno, from, to, addressee } = await searchParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let slips: any[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = createAdminClient() as unknown as { from: (t: string) => any };
    let qb = c.from("fk_payment_slips").select("*,fk_payments(amount),fk_invoices(id,invoice_no,fk_estimates(title,funeral_at,mourner_last_name,mourner_first_name))").eq("funeral_home_id", KANRI_HOME_ID).is("deleted_at", null).order("issued_on", { ascending: false }).limit(300);
    if (pno) qb = qb.ilike("performance_no", `%${pno}%`);
    if (from) qb = qb.gte("issued_on", from);
    if (to) qb = qb.lte("issued_on", to);
    if (addressee) qb = qb.ilike("addressee", `%${addressee}%`);
    const { data } = await qb;
    slips = data ?? [];
  }

  const cols = ["伝票番号", "発行日", "施行番号", "喪主", "葬儀日", "入金先", "伝票区分", "関連請求書:売上区分", "入金額", ""];

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">領収書</h1></div>

      {/* 検索 */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <p className="mb-3 font-bold text-gray-700">検索</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="block text-xs text-gray-500">施行番号</label><input name="pno" defaultValue={pno ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
          <div>
            <label className="block text-xs text-gray-500">発行日</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" name="from" defaultValue={from ?? ""} className="w-full rounded border px-3 py-2" />
              <span className="text-gray-400">〜</span>
              <input type="date" name="to" defaultValue={to ?? ""} className="w-full rounded border px-3 py-2" />
            </div>
          </div>
        </div>
        <div className="mt-3"><label className="block text-xs text-gray-500">宛名</label><input name="addressee" defaultValue={addressee ?? ""} className="mt-1 w-full rounded border px-3 py-2" /></div>
        <button className="mt-4 rounded bg-[#2c8c6f] px-5 py-2 text-white">🔍 検索</button>
      </form>

      {/* 一覧 */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">一覧</p>
          <Link href="/kanri/billing" className="rounded border border-blue-400 px-3 py-1.5 text-xs text-blue-500">＋ 伝票作成</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h, i) => <th key={i} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {slips.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-gray-400">伝票がありません。入金管理から伝票発行できます。</td></tr> :
                slips.map((sl) => {
                  const e = sl.fk_invoices?.fk_estimates ?? {};
                  const mourner = [e.mourner_last_name, e.mourner_first_name].filter(Boolean).join(" ");
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const paid = ((sl.fk_payments ?? []) as any[]).reduce((a, p) => a + (p.amount ?? 0), 0);
                  return (
                    <tr key={sl.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{sl.slip_no ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(sl.issued_on)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{sl.performance_no ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{mourner || sl.addressee || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(e.funeral_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{sl.source ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{sl.slip_kind ?? "—"}</td>
                      <td className="px-3 py-2">
                        {sl.fk_invoices ? (
                          <Link href={`/kanri/billing/${sl.fk_invoices.id}`} className="text-[#4f7cff] underline">{sl.fk_invoices.invoice_no ?? ""}:{e.title ?? ""}</Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">{paid.toLocaleString()}円</td>
                      <td className="px-3 py-2">{sl.fk_invoices && <a href={`/kanri/billing/${sl.fk_invoices.id}/receipt`} target="_blank" rel="noopener noreferrer" className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">領収書</a>}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
