import Link from "next/link";
import { listGuestbook } from "@/lib/admin/data";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

// 芳名録（記帳・焼香・メッセージ）。Supabaseの実データを表示。
export default async function GuestbookPage({ params }: Params) {
  const { id } = await params;
  const rows = await listGuestbook(id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">芳名録（{rows.length}件）</h1>
        <Link href={`/fuhou/ceremonies/${id}`} className="rounded border px-3 py-1.5 text-sm">葬儀詳細へ</Link>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg bg-white p-10 text-center text-gray-400 shadow-sm">
          記帳・お焼香・メッセージはまだありません。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600">
              <tr>{["日時", "種別", "お名前", "内容", "状態"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.createdAt).toLocaleString("ja-JP")}</td>
                  <td className="px-4 py-3"><span className={"rounded px-2 py-0.5 text-xs " + (r.kind === "焼香" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>{r.kind}</span></td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{r.detail}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
