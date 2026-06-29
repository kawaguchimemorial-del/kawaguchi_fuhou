import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { RsvpForm } from "@/components/guest/forms/RsvpForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function RsvpPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m || m.attendDecline) notFound();
  const events = m.events.map((e) => `${e.eventType}（${e.datetimeLabel ?? ""}）`);

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="mb-2 text-center font-serif text-2xl text-[var(--primary)]">
          参列のご登録
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--muted)]">
          ご参列の可否をお知らせください。当日の受付がスムーズになります。
        </p>
        <RsvpForm slug={slug} events={events} />
      </main>
      <SiteFooter />
    </div>
  );
}
