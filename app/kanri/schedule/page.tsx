import Link from "next/link";
import { listEstimates, deceasedFullName, mournerFullName } from "@/lib/kanri/estimates";

export const metadata = { title: "スケジュール管理" };
export const dynamic = "force-dynamic";

function fmtdt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]; return `${d.getMonth() + 1}/${d.getDate()}(${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export default async function SchedulePage() {
  const estimates = await listEstimates();
  type Ev = { at: string; type: string; est: (typeof estimates)[number] };
  const events: Ev[] = [];
  for (const e of estimates) {
    if (e.wakeAt) events.push({ at: e.wakeAt, type: "通夜", est: e });
    if (e.funeralAt) events.push({ at: e.funeralAt, type: "葬儀・告別式", est: e });
  }
  events.sort((a, b) => (a.at < b.at ? -1 : 1));
  const now = Date.now();
  const upcoming = events.filter((ev) => new Date(ev.at).getTime() >= now - 86400000);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">スケジュール管理</h1>
      <p className="text-sm text-gray-500">見積に登録された通夜・葬儀の日程を一覧表示します。</p>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["日時", "種別", "故人", "喪主", "式場", ""].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {upcoming.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">予定がありません。</td></tr> :
              upcoming.map((ev, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap font-medium">{fmtdt(ev.at)}</td>
                  <td className="px-3 py-2"><span className={"rounded px-2 py-0.5 text-xs " + (ev.type === "通夜" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>{ev.type}</span></td>
                  <td className="px-3 py-2">{deceasedFullName(ev.est) || "—"}</td>
                  <td className="px-3 py-2">{mournerFullName(ev.est) || "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{ev.est.venueName ?? "—"}</td>
                  <td className="px-3 py-2"><Link href={`/kanri/estimates/${ev.est.id}`} className="text-xs text-[#9b2fae] underline">見積</Link></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
