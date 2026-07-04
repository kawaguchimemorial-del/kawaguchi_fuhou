import Link from "next/link";
import { getViewStats } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}(${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// オンライン式場 入場一覧（閲覧数）。memorial_views を ip_hash 単位（同一IP=1）で集計。
export default async function EntriesPage({ params }: Params) {
  const { id } = await params;
  const stats = await getViewStats(id);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">入場一覧（閲覧数）</h1>
        <Link href={`/admin/ceremonies/${id}`} className="rounded border px-3 py-1.5 text-sm">葬儀詳細へ</Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">累計入場者数（同一IP=1）</p>
          <p className="mt-1 text-2xl font-bold">{stats.uniqueTotal}<span className="ml-0.5 text-sm font-normal">名</span></p>
        </div>
        <div className="rounded-lg bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">直近30分の入場者数</p>
          <p className="mt-1 text-2xl font-bold">{stats.recent30}<span className="ml-0.5 text-sm font-normal">名</span></p>
        </div>
        <div className="rounded-lg bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-gray-500">入場回数（延べ）</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalVisits}<span className="ml-0.5 text-sm font-normal">回</span></p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">入場日時</th>
              <th className="px-4 py-3 font-medium">訪問者（識別子）</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stats.entries.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-10 text-center text-gray-400">入場（閲覧）記録はまだありません。</td></tr>
            ) : (
              stats.entries.map((e, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 whitespace-nowrap">{fmt(e.createdAt)}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{e.visitor}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-400">
        ※ プライバシー配慮のため、IPアドレスはソルト付きハッシュ化して識別子のみ保持しています。同一IPからの30分以内の再訪問は1回に集約されます。
      </p>
    </div>
  );
}
