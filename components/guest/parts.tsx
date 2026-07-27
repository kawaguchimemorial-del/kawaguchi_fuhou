import Link from "next/link";
import { ShareRow } from "./ShareRow";

export { ShareRow };

/** テスト案件の赤帯 */
export function TestBanner() {
  return (
    <div className="bg-[var(--danger)] py-3 text-center text-sm font-bold tracking-wider text-white">
      この画面はテスト画面です
    </div>
  );
}

/** 金色のアクションボタン（リンク） */
export function GoldButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--accent)] px-8 py-3.5 text-[15px] tracking-wide text-white transition-colors hover:bg-[var(--accent-strong)] " +
        className
      }
    >
      {children}
    </Link>
  );
}

/** ゲスト共通フッター */
export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[var(--primary)] px-6 py-12 text-center text-[var(--primary-foreground)]">
      <p className="font-serif text-3xl tracking-wide">川口典礼</p>
      <p className="mt-1 text-xs tracking-[0.3em] text-[var(--primary-foreground)]/70">
        KAWAGUCHI TENREI
      </p>
      <nav className="mt-6 flex justify-center gap-4 text-xs text-[var(--primary-foreground)]/80">
        <Link href="/policy">サイトポリシー</Link>
        <span>|</span>
        <Link href="/privacy">プライバシーポリシー</Link>
        <span>|</span>
        <Link href="/company">運営会社</Link>
      </nav>
      <p className="mt-6 text-[10px] text-[var(--primary-foreground)]/60">
        © 株式会社川口典礼 All rights reserved
      </p>
    </footer>
  );
}
