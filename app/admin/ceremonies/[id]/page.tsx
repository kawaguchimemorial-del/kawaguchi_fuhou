import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { toWarekiDate } from "@/lib/wareki";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 葬儀詳細（管理）。作成・更新後の遷移先。
export default async function CeremonyDetail({ params }: Params) {
  const { id } = await params; // id = slug
  const m = await getPublicMemorial(id);
  if (!m) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">葬儀詳細</h1>
        <div className="flex gap-2 text-sm">
          <Link href={`/admin/ceremonies/${id}/edit`} className="rounded bg-[#9b2fae] px-4 py-2 text-white">編集する</Link>
          <Link href={`/admin/ceremonies`} className="rounded border px-4 py-2">一覧へ</Link>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <Row label="故人">{m.deceased.nameKanji}{m.deceased.nameKana ? `（${m.deceased.nameKana}）` : ""}</Row>
        <Row label="没日">{m.deceased.deathDate ? `${toWarekiDate(m.deceased.deathDate)}${m.deceased.ageKazoe ? ` ・享年${m.deceased.ageKazoe}` : ""}` : "—"}</Row>
        <Row label="喪主">{m.chiefMourner?.nameKanji ?? "—"}</Row>
        <Row label="宗派">{m.religionType}</Row>
        <Row label="タイプ">{m.venue ? "訃報＋オンライン式場" : "訃報のみ"}</Row>
        <Row label="ステータス"><span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">公開中</span></Row>
      </div>

      <h2 className="mt-8 mb-3 font-bold">式</h2>
      <div className="space-y-3">
        {m.events.map((e) => (
          <div key={e.id} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="font-medium">{e.eventType}</p>
            <p className="text-sm text-gray-600">{e.datetimeLabel ?? (e.startAt ? toWarekiDate(e.startAt) : "日程調整中")}</p>
            {e.venueName && <p className="text-sm text-gray-600">{e.venueName}　{e.venueAddress}</p>}
          </div>
        ))}
      </div>

      <h2 className="mt-8 mb-3 font-bold">公開ページ</h2>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/m/${id}`} target="_blank" className="rounded border border-[#9b2fae] px-4 py-2 text-[#9b2fae]">訃報案内ページを開く ↗</Link>
        {m.venue && (
          <Link href={`/m/${id}/venue`} target="_blank" className="rounded border border-[#9b2fae] px-4 py-2 text-[#9b2fae]">オンライン式場を開く ↗</Link>
        )}
      </div>
      <p className="mt-3 break-all text-xs text-gray-500">共有URL: /m/{id}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6 border-b py-3 last:border-0">
      <span className="w-24 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
