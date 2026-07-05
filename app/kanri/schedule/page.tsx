import { listEstimates, deceasedFullName } from "@/lib/kanri/estimates";

export const metadata = { title: "直近予定" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ base?: string; span?: string; staff?: string }> };

function fmtdt(iso?: string) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]; return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}(${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

export default async function SchedulePage({ searchParams }: SP) {
  const { base, span } = await searchParams;
  const baseDay = base ?? new Date().toISOString().slice(0, 10);
  const days = Number(span ?? 1) || 1;
  const from = new Date(baseDay + "T00:00:00");
  const to = new Date(from.getTime() + days * 86400000);

  const estimates = await listEstimates();
  type Ev = { at: string; label: string; est: (typeof estimates)[number] };
  const events: Ev[] = [];
  for (const e of estimates) {
    if (e.wakeAt) events.push({ at: e.wakeAt, label: "通夜", est: e });
    if (e.funeralAt) events.push({ at: e.funeralAt, label: "葬儀", est: e });
  }
  const rows = events
    .filter((ev) => { const d = new Date(ev.at); return d >= from && d < to; })
    .sort((a, b) => a.at.localeCompare(b.at));

  const cols = ["日時", "会場", "対象者、内容", "住所", "施行担当者", "供花受入", "供物受入", "香典受入", "問い合わせ対応", "葬儀種別"];

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">直近予定</h1></div>

      {/* 一覧の条件（実画面準拠） */}
      <form className="mb-4 rounded-lg bg-white p-4 shadow-sm text-sm">
        <p className="mb-3 font-bold text-gray-700">一覧の条件</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="mb-1 block font-bold text-gray-700">基準日</label><input type="date" name="base" defaultValue={baseDay} className="w-full rounded border px-3 py-2" /></div>
          <div>
            <label className="mb-1 block font-bold text-gray-700">期間</label>
            <select name="span" defaultValue={String(days)} className="w-full rounded border px-3 py-2">
              <option value="1">1日</option><option value="3">3日</option><option value="7">7日</option><option value="30">30日</option>
            </select>
          </div>
          <div><label className="mb-1 block font-bold text-gray-700">担当</label><select name="staff" className="w-full rounded border px-3 py-2"><option value=""></option><option>松澤 覚</option></select></div>
        </div>
        <button className="mt-4 rounded bg-[#2c8c6f] px-5 py-2 text-white">🔍 絞り込み</button>
      </form>

      {/* 一覧（実画面準拠の列構成） */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">一覧</p>
          <a href="/kanri/analytics/sales/export" className="rounded border border-[#5b6ee1] px-3 py-1.5 text-xs text-[#5b6ee1]">⬇ CSVダウンロード</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{cols.map((h) => <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-gray-400">該当する予定はありません。</td></tr> :
                rows.map((ev, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtdt(ev.at)}</td>
                    <td className="px-3 py-2">{ev.est.venueName ?? "—"}</td>
                    <td className="px-3 py-2">{deceasedFullName(ev.est) || "—"} 様 {ev.label}</td>
                    <td className="px-3 py-2 text-gray-500">{ev.est.venueAddress ?? "—"}</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">—</td>
                    <td className="px-3 py-2">{ev.est.religion ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
