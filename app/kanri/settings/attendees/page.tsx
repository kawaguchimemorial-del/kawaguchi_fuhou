import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata = { title: "参列者" };
export const dynamic = "force-dynamic";

function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export default async function AttendeesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = createAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await c.from("condolence_messages").select("id,sender_name,created_at,memorials(slug)").order("created_at", { ascending: false }).limit(300);
    rows = data ?? [];
  }
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">参列者</h1></div>
      <p className="mb-3 font-bold text-gray-700">参列者一覧（ご記帳）</p>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500"><tr>{["お名前", "記帳日時", "葬儀ページ"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length === 0 ? <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400">参列者はまだいません。</td></tr> :
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">{r.sender_name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmt(r.created_at)}</td>
                  <td className="px-3 py-2.5">{r.memorials?.slug ? <a href={`/fuhou/ceremonies/${r.memorials.slug}`} className="text-[#2c8c6f] underline">葬儀詳細</a> : "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
