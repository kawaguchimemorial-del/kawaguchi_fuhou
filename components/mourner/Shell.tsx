import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** 各下層ページ共通の見出し＋戻る導線。＠葬儀の「マイページへ戻る」に相当。 */
export function PageHeader({ title, backHref, backLabel = "マイページへ戻る" }: {
  title: string;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-6 pt-8">
      <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm text-[#6b6b6b] hover:text-[#1b2a4a]">
        <ChevronLeft size={16} /> {backLabel}
      </Link>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">{children}</section>;
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t pt-6 text-center text-xs text-[#9a9a9a]">
      <p>川口典礼</p>
    </footer>
  );
}
