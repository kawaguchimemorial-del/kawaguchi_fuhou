import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminMemorial } from "@/lib/admin/data";
import { AltarView } from "@/components/guest/AltarView";
import { AlbumGallery } from "@/components/guest/AlbumGallery";
import { HlsPlayer } from "@/components/guest/HlsPlayer";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 管理用オンライン式場ビュー（公開状態に関わらず当時の内容を確認できる）。
export default async function AdminVenueView({ params }: Params) {
  const { id } = await params;
  const m = await getAdminMemorial(id);
  if (!m || !m.venue) notFound();
  const v = m.venue;
  const scenes = v.scenePaths && v.scenePaths.length > 0 ? v.scenePaths : v.ceremonyPhotoPath ? [v.ceremonyPhotoPath] : [];
  const statusLabel = m.status === "published" ? "公開中" : m.status === "draft" ? "下書き" : "公開終了";

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      {/* 管理バー */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-[#9b2fae] px-4 py-3 text-sm text-white">
        <span>オンライン式場（管理プレビュー）／{statusLabel}</span>
        <Link href={`/admin/ceremonies/${id}`} className="rounded border border-white/60 px-3 py-1">← 葬儀詳細へ</Link>
      </div>

      <main className="mx-auto max-w-xl px-5 pt-8 pb-16">
        <header className="text-center">
          <h1 className="mt-2 font-serif text-2xl text-[var(--primary)]">故 {m.deceased.nameKanji} 儀</h1>
          <p className="font-serif text-xl text-[var(--primary)]">{v.venueName || "葬儀会場"}</p>
        </header>

        <div className="mt-6 md:relative md:left-1/2 md:w-[90vw] md:max-w-none md:-translate-x-1/2">
          <AltarView altar={v.altar} portraitAlt={m.deceased.portraitAlt} />
        </div>

        {scenes.length > 0 && (
          <section className="mt-10">
            <SectionHeading>葬儀の様子</SectionHeading>
            <AlbumGallery paths={scenes} />
          </section>
        )}

        {v.albumPaths && v.albumPaths.length > 0 && (
          <section className="mt-10">
            <SectionHeading>アルバム</SectionHeading>
            <AlbumGallery paths={v.albumPaths} />
          </section>
        )}

        {((v.videos && v.videos.length > 0) || (v.youtube && v.youtube.length > 0)) && (
          <section className="mt-10">
            <SectionHeading>動画</SectionHeading>
            <div className="mt-4 space-y-6">
              {(v.videos ?? []).map((mv, i) => (
                <figure key={`vi-${i}`}>
                  <HlsPlayer src={`/api/vid/${mv.vimeoId}`} title={mv.title ?? `動画${i + 1}`} />
                  {mv.title && <figcaption className="mt-2 text-center text-sm text-[var(--muted)]">{mv.title}</figcaption>}
                </figure>
              ))}
              {(v.youtube ?? []).map((yt, i) => (
                <div key={`yt-${i}`} className="relative w-full overflow-hidden rounded" style={{ paddingTop: "56.25%" }}>
                  <iframe src={yt.url} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={yt.title ?? `ライブ配信${i + 1}`} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <SectionHeading>{v.greetingHeading || "喪主挨拶"}</SectionHeading>
          <div className="mt-4 space-y-2 text-sm leading-loose">
            {(v.greetingBody || "").split("\n").map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <p className="mt-4 text-right text-sm">{v.greetingSignature}</p>
        </section>

        {v.openFrom && (
          <section className="mt-12 text-center">
            <SectionHeading>公開期間</SectionHeading>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {new Date(v.openFrom).toLocaleDateString("ja-JP")}
              {v.openDays ? `　（${v.openDays}日間）` : ""}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-center font-serif text-xl text-[var(--primary)]">
      {children}
      <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
    </h2>
  );
}
