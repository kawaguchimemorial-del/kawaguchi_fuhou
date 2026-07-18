import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { listVisitors } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

// 入場記録。訃報／オンライン式場ページの閲覧ログ。記帳前の閲覧者も含まれる。

const PAGE = 50;
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const KIND_JA: Record<string, string> = { obituary: "訃報ページ", venue: "オンライン式場" };

function jpDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

export default async function VisitorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const { show } = await searchParams;
  const limit = Math.min(Math.max(Number(show) || PAGE, PAGE), 2000);
  const { rows, total } = await listVisitors(id, limit, 0);

  return (
    <div>
      <PageHeader title="入場記録" backHref={`/mypage/${id}`} />

      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-[#6b6b6b]">全 {total} 件</p>
        <a href={`/mypage/${id}/visitors/export`}
           className="inline-flex items-center gap-1.5 rounded border border-[#ccc] bg-white px-4 py-2.5 text-sm">
          <Download size={16} /> 入場記録をダウンロード
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-[#8a8a8a] shadow-sm">
          まだ入場記録はありません。
        </p>
      ) : (
        <ul className="divide-y rounded-lg bg-white shadow-sm">
          {rows.map((v) => (
            <li key={v.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="text-sm">お名前不明</span>
              <span className="shrink-0 text-xs text-[#8a8a8a]">
                {KIND_JA[v.kind] ?? v.kind} / {jpDateTime(v.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows.length < total && (
        <div className="mt-4 text-center">
          <Link href={`/mypage/${id}/visitors?show=${limit + PAGE}`}
                className="inline-block rounded border border-[#ccc] bg-white px-6 py-3 text-sm">
            さらに表示（{rows.length}件目まで表示中 / 全{total}件）
          </Link>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={`/mypage/${id}/attendees`} className="text-sm text-[#1b2a4a] underline">
          芳名録へ
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
