import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { religionVocab } from "@/lib/memorial/religion";
import { isPast } from "@/lib/format";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { KodenForm } from "@/components/guest/forms/KodenForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function KodenPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();
  const closed = m.kodenDecline || isPast(m.kodenAcceptUntil);
  const vocab = religionVocab(m.religionType);

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="mb-8 text-center font-serif text-2xl text-[var(--primary)]">
          お香典
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        {closed ? (
          <p className="rounded bg-[var(--card)] px-6 py-10 text-center text-[var(--muted)]">
            お香典の受付は終了、またはご辞退されております。
          </p>
        ) : (
          <KodenForm slug={slug} hyogaki={vocab.kodenHyogaki} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
