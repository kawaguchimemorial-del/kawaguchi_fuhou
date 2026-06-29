import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { religionVocab } from "@/lib/memorial/religion";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { WorshipForm } from "@/components/guest/forms/WorshipForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function WorshipPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m || m.attendDecline) notFound();
  const vocab = religionVocab(m.religionType);

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="mb-2 text-center font-serif text-2xl text-[var(--primary)]">
          {vocab.worshipLabel}
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--muted)]">
          故 {m.deceased.nameKanji} 様へ、心を込めて{vocab.worshipAction}ことができます。
        </p>
        <WorshipForm slug={slug} worshipLabel={vocab.worshipLabel} />
      </main>
      <SiteFooter />
    </div>
  );
}
