import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { MessageForm } from "@/components/guest/forms/MessageForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function MessagePage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="mb-2 text-center font-serif text-2xl text-[var(--primary)]">
          お悔やみメッセージ
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--muted)]">
          故 {m.deceased.nameKanji} 様のご遺族へ、お気持ちをお届けいただけます。
        </p>
        <MessageForm slug={slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
