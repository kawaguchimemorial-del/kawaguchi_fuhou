import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { isPast } from "@/lib/format";
import { OFFERING_PRODUCTS } from "@/lib/memorial/products";
import { getPublicProducts, getMemorialFlowerSelection } from "@/lib/memorial/db";
import { TestBanner, SiteFooter } from "@/components/guest/parts";
import { FlowerOrderForm } from "@/components/guest/forms/FlowerOrderForm";

type Params = { params: Promise<{ slug: string }> };
export const metadata = { robots: { index: false, follow: false } };

export default async function FlowerPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();

  const closed = m.flowerDecline || isPast(m.offeringAcceptUntil);

  // 管理画面（オンライン供花・品物設定）で登録した実商品を表示。
  // 未登録・DB未設定時のみ暫定ダミーにフォールバック。
  const dbProducts = await getPublicProducts();
  // 訃報ごとに「表示する供花・供物」が選択されていれば、それだけに絞る(未選択=全表示)。
  const selectedIds = await getMemorialFlowerSelection(slug);
  const filtered = selectedIds ? dbProducts.filter((p) => selectedIds.includes(p.id)) : dbProducts;
  const products = filtered.length > 0 ? filtered : (dbProducts.length > 0 ? dbProducts : OFFERING_PRODUCTS);

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
          <FlowerOrderForm slug={slug} products={products} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
