import type { Metadata } from "next";

// 喪主マイページ。＠葬儀 bereaved.at-sougi.com 相当。
// 高齢の喪主が主な利用者のため、文字は大きめ・1カラム・タップ領域を広く取る。

export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false, follow: false },
};

export default function MournerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#2b2b2b]">
      <div className="mx-auto max-w-2xl px-4 pb-16">{children}</div>
    </div>
  );
}
