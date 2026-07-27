import Link from "next/link";
import { SiteFooter } from "./parts";

/** 特商法・プライバシー・サイトポリシー・運営会社で共通の体裁 */
export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-10 text-center font-serif text-2xl text-[var(--primary)]">
          {title}
          <span className="mx-auto mt-2 block h-px w-16 bg-[var(--accent)]" />
        </h1>
        <div className="space-y-8 text-sm leading-relaxed">{children}</div>
        <p className="mt-12 text-center">
          <Link href="/" className="text-[var(--accent)] underline">
            トップへ戻る
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

/** 定義リスト形式の1行（特商法・運営会社で使用） */
export function DefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border)] py-4 sm:flex-row sm:gap-6">
      <dt className="w-48 shrink-0 font-medium text-[var(--primary)]">{label}</dt>
      <dd className="flex-1 whitespace-pre-wrap">{children}</dd>
    </div>
  );
}

/** 見出し＋本文のセクション（ポリシー系で使用） */
export function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-medium text-[var(--primary)]">{title}</h2>
      <div className="space-y-2 text-[var(--foreground)]">{children}</div>
    </section>
  );
}
