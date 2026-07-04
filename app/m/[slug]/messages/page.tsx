import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicMemorial } from "@/lib/memorial/data";
import { getPublicMessages } from "@/lib/memorial/db";
import { TestBanner, SiteFooter } from "@/components/guest/parts";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ submitted?: string }> };
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function MessagesPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { submitted } = await searchParams;
  const m = await getPublicMemorial(slug);
  if (!m) notFound();
  const messages = await getPublicMessages(slug);

  return (
    <div className="min-h-screen">
      {m.testMode && <TestBanner />}
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-2 text-center font-serif text-2xl text-[var(--primary)]">
          頂いたご記帳・お悔やみメッセージ
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--muted)]">
          故 {m.deceased.nameKanji} 様へ寄せられたメッセージ（{messages.length}件）
        </p>

        {submitted && (
          <p className="mb-6 rounded bg-[var(--card)] px-4 py-3 text-center text-sm text-[var(--primary)]">
            メッセージを承りました。ありがとうございました。
          </p>
        )}

        {messages.length === 0 ? (
          <p className="rounded-md bg-[var(--card)] px-6 py-10 text-center text-sm text-[var(--muted)]">
            まだメッセージはありません。
          </p>
        ) : (
          <ul className="space-y-5">
            {messages.map((msg, i) => (
              <li key={i} className="rounded-md bg-[var(--card)] px-5 py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-lg text-[var(--primary)]">{msg.senderName} 様</p>
                  <p className="shrink-0 text-xs text-[var(--muted)]">{fmt(msg.createdAt)}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{msg.body}</p>
                {msg.imagePaths.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {msg.imagePaths.map((src, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={j} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt={`${msg.senderName}様のお写真${j + 1}`} className="h-28 w-28 rounded object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href={`/m/${slug}/message`} className="rounded-sm bg-[var(--accent)] px-6 py-3 text-sm text-white">メッセージを送る</Link>
          <Link href={`/m/${slug}/venue/hall`} className="rounded-sm border border-[var(--accent)] px-6 py-3 text-sm text-[var(--accent)]">式場へ戻る</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
