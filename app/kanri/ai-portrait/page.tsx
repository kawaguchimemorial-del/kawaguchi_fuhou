import Link from "next/link";
import { ImageIcon, Plus } from "lucide-react";
import { listAiPortraits } from "@/lib/kanri/ai-portraits";
import { listEstimates } from "@/lib/kanri/estimates";
import { PortraitRelinkButton, type EstimateOption } from "@/components/kanri/PortraitRelinkButton";

export const metadata = { title: "AI遺影写真" };
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

export default async function AiPortraitPage() {
  const [portraits, estimates] = await Promise.all([listAiPortraits(), listEstimates()]);
  // 紐付け修正モーダル用の見積候補(軽量化のため必要項目のみ)
  const estimateOptions: EstimateOption[] = estimates.map((e) => ({
    id: e.id,
    no: e.estimateNo,
    customer: e.customerName,
    deceased: [e.deceased.lastName, e.deceased.firstName].filter(Boolean).join(" "),
    date: fmtDate(e.funeralAt || e.wakeAt || e.deceased.deathDate),
  }));

  return (
    <div className="space-y-5">
      {/* 上部: AI遺影写真を作成する CTA */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#2c8c6f] to-[#1aa39a] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ImageIcon size={32} className="shrink-0" />
            <div>
              <h1 className="text-lg font-bold">AI遺影写真</h1>
              <p className="mt-1 text-sm text-white/85">お写真からAIで遺影を作成します。表情や背景・服装の補正に対応。</p>
            </div>
          </div>
          <Link
            href="/kanri/ai-portrait/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-[#2c8c6f] shadow-sm transition hover:bg-white/90"
          >
            <Plus size={20} /> AI遺影写真を作成する
          </Link>
        </div>
      </div>

      {/* 作成済み一覧 */}
      <div className="rounded-lg bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">作成した遺影写真　<span className="font-normal text-gray-500">{portraits.length} 件</span></h2>
        </div>

        {portraits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 py-14 text-center">
            <ImageIcon size={40} className="text-gray-300" />
            <p className="text-sm text-gray-500">まだ作成された遺影写真はありません。</p>
            <Link href="/kanri/ai-portrait/new" className="rounded-lg bg-[#2c8c6f] px-5 py-2.5 text-sm font-medium text-white">最初の遺影写真を作成する</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500">
                <tr>{["写真", "対象者", "顧客", "葬儀日", "作成", "ダウンロード", "見積の紐付け", "編集"].map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {portraits.map((p) => (
                  <tr key={p.id} className="align-middle hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a href={p.imageUrl} target="_blank" rel="noopener noreferrer"><img src={p.thumbUrl || p.imageUrl} alt={p.deceasedName ? `${p.deceasedName} 様の遺影` : "遺影写真"} className="h-full w-full object-cover" /></a>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300"><ImageIcon size={20} /></div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{p.deceasedName || "（未設定）"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.customerName || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {p.funeralAt
                        ? `${fmtDate(p.funeralAt)}${p.funeralAtIsWake ? "（通夜）" : ""}`
                        : !p.estimateId ? <span className="text-amber-600">施行未紐付け</span> : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">{fmt(p.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <div className="flex gap-3">
                        {p.imageUrl && <a href={`${p.imageUrl}?download=遺影_${encodeURIComponent(p.deceasedName || "portrait")}.png`} className="text-[#1aa39a] underline">基準</a>}
                        {p.tefudaUrl && <a href={`${p.tefudaUrl}?download=遺影手札_${encodeURIComponent(p.deceasedName || "portrait")}.png`} className="text-[#1aa39a] underline">手札</a>}
                        {p.monitorUrl && <a href={`${p.monitorUrl}?download=遺影モニター_${encodeURIComponent(p.deceasedName || "portrait")}.png`} className="text-[#1aa39a] underline">モニター</a>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <PortraitRelinkButton
                        portraitId={p.id}
                        currentEstimateId={p.estimateId}
                        deceasedName={p.deceasedName}
                        estimates={estimateOptions}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <a
                        href={`/iei-photo?${new URLSearchParams({
                          portrait_id: p.id,
                          ...(p.deceasedName ? { deceased: p.deceasedName } : {}),
                          ...(p.customerId ? { customer_id: p.customerId } : {}),
                          ...(p.customerName ? { customer_name: p.customerName } : {}),
                          ...(p.estimateId ? { estimate_id: p.estimateId } : {}),
                        }).toString()}`}
                        className="rounded border border-[#2c8c6f] px-2 py-1 font-medium text-[#2c8c6f] hover:bg-[#f2fbfa]"
                      >
                        写真を差し替え
                      </a>
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
