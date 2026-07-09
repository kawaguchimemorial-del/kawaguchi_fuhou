import Link from "next/link";
import { ImageIcon, Plus } from "lucide-react";
import { listAiPortraits } from "@/lib/kanri/ai-portraits";

export const metadata = { title: "AI遺影写真" };
export const dynamic = "force-dynamic";

function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AiPortraitPage() {
  const portraits = await listAiPortraits();

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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {portraits.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-lg border border-gray-200">
                <div className="aspect-[3/4] w-full bg-gray-100">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbUrl || p.imageUrl} alt={p.deceasedName ? `${p.deceasedName} 様の遺影` : "遺影写真"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300"><ImageIcon size={32} /></div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium text-gray-800">{p.deceasedName || "（対象者未設定）"}</p>
                  {p.customerName && <p className="truncate text-xs text-gray-500">顧客：{p.customerName}</p>}
                  {!p.estimateId && <p className="text-[11px] text-amber-600">施行未紐付け</p>}
                  <p className="text-xs text-gray-400">{fmt(p.createdAt)}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {p.imageUrl && <a href={`${p.imageUrl}?download=遺影_${encodeURIComponent(p.deceasedName || "portrait")}.png`} className="text-[#1aa39a] underline">基準写真DL</a>}
                    {p.tefudaUrl && <a href={`${p.tefudaUrl}?download=遺影手札_${encodeURIComponent(p.deceasedName || "portrait")}.png`} className="text-[#1aa39a] underline">手札DL</a>}
                    {p.imageUrl && <a href={p.imageUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 underline">開く</a>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
