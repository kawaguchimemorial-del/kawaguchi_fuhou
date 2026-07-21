import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { SiteFooter } from "@/components/guest/parts";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ redirect_status?: string }> };
export const metadata = { robots: { index: false, follow: false } };

// 供花・供物カード決済の return_url。確定(請求書・メール)はWebhookで行う。
export default async function FlowerCompletePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { redirect_status } = await searchParams;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();

  const ok = redirect_status === "succeeded";
  const processing = redirect_status === "processing";

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-xl px-5 py-16">
        <div className="rounded-md bg-[var(--card)] px-6 py-12 text-center">
          {ok ? (
            <>
              <p className="font-serif text-xl text-[var(--primary)]">ご注文を承りました</p>
              <p className="mt-4 text-sm text-[var(--muted)]">
                クレジットカードでのお支払いが完了しました。<br />
                ご登録のメールアドレスへ確認メールをお送りします。
              </p>
            </>
          ) : processing ? (
            <>
              <p className="font-serif text-xl text-[var(--primary)]">お支払いを確認しています</p>
              <p className="mt-4 text-sm text-[var(--muted)]">確定までしばらくお待ちください。完了メールでご確認いただけます。</p>
            </>
          ) : (
            <>
              <p className="font-serif text-xl text-[var(--primary)]">お支払いが完了しませんでした</p>
              <p className="mt-4 text-sm text-[var(--muted)]">ご注文は確定しておりません。お手数ですが、もう一度お試しください。</p>
              <Link href={`/m/${slug}/flower`} className="mt-6 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]">
                供花・供物のお申し込みへ戻る
              </Link>
            </>
          )}
          {(ok || processing) && (
            <Link href={`/m/${slug}`} className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]">
              訃報ページへ戻る
            </Link>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
