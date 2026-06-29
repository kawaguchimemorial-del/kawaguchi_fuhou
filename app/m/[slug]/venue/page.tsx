import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { TestBanner, GoldButton, SiteFooter } from "@/components/guest/parts";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { robots: { index: false, follow: false } };

// オンライン式場TOP（入場前）
export default async function VenueEntry({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m || !m.venue) notFound();
  const v = m.venue;

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <p className="font-serif text-2xl text-[var(--primary)]">
          故 {m.deceased.nameKanji} 儀
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--primary)]">
          葬儀会場
          <span className="mx-auto mt-3 block h-px w-16 bg-[var(--accent)]" />
        </h1>

        <div className="mt-10 bg-[var(--card)] px-6 py-12">
          {v.openFrom && v.openUntil && (
            <>
              <p className="font-serif text-[var(--primary)]">公開期間</p>
              <p className="mt-2 text-sm text-[var(--primary)]">
                {new Date(v.openFrom).toLocaleString("ja-JP")} 〜<br />
                {new Date(v.openUntil).toLocaleString("ja-JP")}
                {v.openDays ? `（${v.openDays}日間）` : ""}
              </p>
            </>
          )}
          <div className="mt-8">
            <GoldButton href={`/m/${m.slug}/venue/hall`} className="px-16">
              入場　›
            </GoldButton>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
