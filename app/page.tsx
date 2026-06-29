import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-serif text-2xl tracking-wide text-[var(--primary)]">川口典礼</p>
      <p className="mt-6 text-sm tracking-widest text-[var(--accent)]">ONLINE MEMORIAL</p>
      <h1 className="mt-3 font-serif text-4xl leading-snug">
        離れていても、
        <br />
        心を込めてお別れを。
      </h1>
      <p className="mt-6 text-[var(--muted)]">
        オンライン訃報案内とオンライン祭壇で、ご遺族と参列者をやさしくつなぎます。
        訃報のご案内、ご焼香・献花、香典・供花のお申し込み、お悔やみメッセージまで。
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/account/sign-in"
          className="rounded-lg bg-[var(--primary)] px-6 py-3 text-[var(--primary-foreground)]"
        >
          ログイン
        </Link>
        <Link
          href="/about"
          className="rounded-lg border px-6 py-3"
        >
          サービスについて
        </Link>
      </div>

      <p className="mt-16 text-xs text-[var(--muted)]">
        ※ 開発中のプレビューです。
      </p>
    </main>
  );
}
