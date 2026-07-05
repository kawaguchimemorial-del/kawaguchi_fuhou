import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata = { title: "参列者からのメッセージ" };
export const dynamic = "force-dynamic";

function fmt(iso?: string | null) { if (!iso) return ""; const d = new Date(String(iso)); if (isNaN(d.getTime())) return ""; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

const STATUS: Record<string, string> = { pending: "確認待ち", approved: "公開", rejected: "非公開", hidden: "非表示" };

export default async function MessagesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = createAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await c.from("condolence_messages").select("id,sender_name,body,moderation_status,created_at,memorials(slug)").order("created_at", { ascending: false }).limit(300);
    rows = data ?? [];
  }
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">参列者からのメッセージ</h1></div>
      <p className="mb-3 font-bold text-gray-700">メッセージ一覧</p>
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-500"><tr>{["お名前", "メッセージ", "状態", "投稿日時"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {rows.length === 0 ? <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">メッセージはまだありません。</td></tr> :
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.sender_name}</td>
                  <td className="px-3 py-2.5 text-gray-700">{r.body}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><span className={"rounded px-2 py-0.5 text-xs " + (r.moderation_status === "approved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{STATUS[r.moderation_status] ?? r.moderation_status}</span></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{fmt(r.created_at)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
