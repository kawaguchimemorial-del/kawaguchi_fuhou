import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { religionVocab } from "@/lib/memorial/religion";
import { TestBanner, GoldButton, ShareRow, SiteFooter } from "@/components/guest/parts";
import { AltarView } from "@/components/guest/AltarView";
import { AlbumGallery } from "@/components/guest/AlbumGallery";
import { logView } from "@/lib/memorial/db";
import { getSiteOrigin } from "@/lib/site-url";
import type { Memorial } from "@/lib/memorial/types";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { robots: { index: false, follow: false } };

// オンライン式場（入場後＝祭壇）
export default async function VenueHall({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m || !m.venue) notFound();
  const v = m.venue;
  const vocab = religionVocab(m.religionType);
  await logView(slug, "venue"); // 入場（閲覧）を記録

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}

      <main className="mx-auto max-w-xl px-5 pt-10">
        {/* タイトル */}
        <header className="text-center">
          <p className="text-[var(--accent-strong)]">🏵️</p>
          <h1 className="mt-2 font-serif text-2xl text-[var(--primary)]">
            故 {m.deceased.nameKanji} 儀
          </h1>
          <p className="font-serif text-xl text-[var(--primary)]">葬儀会場</p>
        </header>

        {/* 祭壇（PCでは本文より広く表示して遺影を大きく見せる） */}
        <div className="mt-6 md:relative md:left-1/2 md:w-[90vw] md:max-w-none md:-translate-x-1/2">
          <AltarView altar={v.altar} portraitAlt={m.deceased.portraitAlt} />
        </div>

        {/* バーチャル参拝 */}
        <div className="mt-6 text-center">
          <GoldButton href={`/m/${m.slug}/worship`} className="px-16">
            {vocab.worshipLabel}をする
          </GoldButton>
        </div>

        {/* ご記帳・メッセージ受付 */}
        <section className="mt-10 bg-[var(--card)] px-6 py-8 text-center">
          <h2 className="font-serif text-xl text-[var(--primary)]">
            ご記帳・メッセージ受付
            <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
            参列者様のご記帳をお願いいたします。
            <br />
            故人・ご遺族へメッセージやお写真もお送りいただけます。
          </p>
          <div className="mt-6">
            <GoldButton href={`/m/${m.slug}/message`}>受付はこちら　›</GoldButton>
          </div>
        </section>

        {/* 葬儀の様子（複数写真。旧・単写真 ceremonyPhotoPath はフォールバック） */}
        {(() => {
          const scenes =
            v.scenePaths && v.scenePaths.length > 0
              ? v.scenePaths
              : v.ceremonyPhotoPath
              ? [v.ceremonyPhotoPath]
              : [];
          return scenes.length > 0 ? (
            <section className="mt-10">
              <SectionHeading>葬儀の様子</SectionHeading>
              <AlbumGallery paths={scenes} />
            </section>
          ) : null;
        })()}

        {/* アルバム */}
        {v.albumPaths.length > 0 && (
          <section className="mt-10">
            <SectionHeading>アルバム</SectionHeading>
            <AlbumGallery paths={v.albumPaths} />
          </section>
        )}

        {/* 喪主挨拶 */}
        <section className="mt-12">
          <SectionHeading>{v.greetingHeading}</SectionHeading>
          <div className="mt-4 space-y-2 text-sm leading-loose">
            {v.greetingBody.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <p className="mt-4 text-right text-sm">{v.greetingSignature}</p>
        </section>

        {/* 公開期間 */}
        {v.openFrom && v.openUntil && (
          <section className="mt-12 text-center">
            <SectionHeading>公開期間</SectionHeading>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {new Date(v.openFrom).toLocaleString("ja-JP")} 〜{" "}
              {new Date(v.openUntil).toLocaleString("ja-JP")}
            </p>
          </section>
        )}

        <div className="mt-8">
          <ShareRow
            url={`${await getSiteOrigin()}/m/${m.slug}/venue`}
            title={`${m.deceased.nameKanji} 様 オンライン式場`}
          />
        </div>
      </main>

      <SiteFooter />
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
