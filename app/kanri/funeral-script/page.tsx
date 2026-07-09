import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { listFuneralScripts } from "@/lib/kanri/funeral-scripts";
import { CEREMONY_TYPE_LABELS } from "@/lib/funeral-script/format";
import type { FuneralScriptCeremonyType } from "@/lib/funeral-script/types";

export const metadata = { title: "司会台本・会葬礼状" };
export const dynamic = "force-dynamic";

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
function ceremonyLabel(t?: string): string {
  if (!t) return "—";
  return CEREMONY_TYPE_LABELS[t as FuneralScriptCeremonyType] ?? t;
}

export default async function FuneralScriptListPage() {
  const scripts = await listFuneralScripts();

  return (
    <div className="space-y-5">
      {/* 上部: 台本を作成する CTA */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileText size={32} className="shrink-0 text-amber-300" />
            <div>
              <h1 className="text-lg font-bold">司会台本・会葬礼状</h1>
              <p className="mt-1 text-sm text-white/85">故人情報からAIで司会台本・会葬礼状を作成します。作成した台本はここに保存されます。</p>
            </div>
          </div>
          <Link
            href="/kanri/funeral-script/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-base font-bold text-slate-900 shadow-sm transition hover:bg-amber-400"
          >
            <Plus size={20} /> 台本を作成する
          </Link>
        </div>
      </div>

      {/* 作成済み一覧 */}
      <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">作成した台本　<span className="font-normal text-gray-500">{scripts.length} 件</span></h2>
        </div>

        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 py-14 text-center">
            <FileText size={40} className="text-gray-300" />
            <p className="text-sm text-gray-500">まだ作成された台本はありません。</p>
            <Link href="/kanri/funeral-script/new" className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white">最初の台本を作成する</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500">
                <tr>{["対象者", "顧客", "式種別", "葬儀日", "内容", "作成", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {scripts.map((s) => (
                  <tr key={s.id} className="align-middle hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{s.deceasedName || "（未設定）"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{s.customerName || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{ceremonyLabel(s.ceremonyType)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {s.funeralAt
                        ? `${fmtDate(s.funeralAt)}${s.funeralAtIsWake ? "（通夜）" : ""}`
                        : !s.estimateId ? <span className="text-amber-600">施行未紐付け</span> : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {s.sectionCount ? `台本 ${s.sectionCount}項目` : "—"}{s.hasLetter ? " ／ 礼状" : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">{fmt(s.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <div className="flex gap-3">
                        <Link href={`/funeral-script?script_id=${s.id}`} className="font-medium text-[#1aa39a] underline">開く</Link>
                        <a href={`/api/funeral-script/${s.id}?format=txt`} className="text-[#1aa39a] underline">ダウンロード</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
