import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata = { title: "故人" };
export const dynamic = "force-dynamic";

function fmt(iso?: string | null) { if (!iso) return ""; return String(iso).slice(0, 10).replace(/-/g, "/"); }

export default async function DeceasedPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = createAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await c.from("deceased").select("*,memorials(slug,status)").order("created_at", { ascending: false }).limit(200);
    rows = data ?? [];
  }
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">故人</h1></div>
      <p className="mb-3 font-bold text-gray-700">故人一覧</p>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500"><tr>{["お名前", "カナ", "没日", "享年", "訃報ページ"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length === 0 ? <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">故人が登録されていません。</td></tr> :
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">{r.name_kanji}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.name_kana ?? ""}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmt(r.death_date)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.age_kazoe ?? r.age_full ?? ""}</td>
                  <td className="px-3 py-2.5">{r.memorials?.slug ? <a href={`/admin/ceremonies/${r.memorials.slug}`} className="text-[#2c8c6f] underline">葬儀詳細</a> : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
