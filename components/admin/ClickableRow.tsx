"use client";
import { useRouter } from "next/navigation";

// テーブル行をクリックで遷移可能にする（サーバーコンポーネントのtable内で使用）。
export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer transition-colors hover:bg-[#faf5fb]"
    >
      {children}
    </tr>
  );
}
