import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { isPast } from "@/lib/format";
import { OFFERING_PRODUCTS } from "@/lib/memorial/products";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { FlowerOrderForm } from "@/components/guest/forms/FlowerOrderForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function FlowerPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();

  const closed = m.flowerDecline || isPast(m.offeringAcceptUntil);

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="mb-8 text-center font-serif text-2xl text-[var(--primary)]">
          供花・供物 注文フォーム
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        {closed ? (
          <p className="rounded bg-[var(--card)] px-6 py-10 text-center text-[var(--muted)]">
            申し訳ございません。供花・供物のご注文受付は終了いたしました。
          </p>
        ) : (
          <FlowerOrderForm slug={slug} products={OFFERING_PRODUCTS} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
