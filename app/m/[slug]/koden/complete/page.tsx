import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { SiteFooter } from "@/components/guest/parts";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ redirect_status?: string }> };
export const metadata = { robots: { index: false, follow: false } };

// Stripe Payment Element の return_url。redirect_status で結果を表示（確定の真実源はWebhook）。
export default async function KodenCompletePage({ params, searchParams }: Params) {
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
              <p className="font-serif text-xl text-[var(--primary)]">お香典をお預かりしました</p>
              <p className="mt-4 text-sm text-[var(--muted)]">
                ご厚志を賜り、誠にありがとうございます。<br />
                喪主さまへ確かにお届けいたします。
              </p>
            </>
          ) : processing ? (
            <>
              <p className="font-serif text-xl text-[var(--primary)]">お支払いを確認しています</p>
              <p className="mt-4 text-sm text-[var(--muted)]">確定までしばらくお待ちください。完了メール等でご確認いただけます。</p>
            </>
          ) : (
            <>
              <p className="font-serif text-xl text-[var(--primary)]">お支払いが完了しませんでした</p>
              <p className="mt-4 text-sm text-[var(--muted)]">お手数ですが、もう一度お試しください。</p>
              <Link href={`/m/${slug}/koden`} className="mt-6 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]">
                お香典の入力へ戻る
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
