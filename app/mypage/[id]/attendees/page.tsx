import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { listAttendees } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

// 芳名録。＠葬儀は先頭に香典精算テーブルを置くが、自社版は香典機能を提供しないため
// 「ダウンロード → 一覧(20件ずつ)」のみとする。

const PAGE = 20;
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function jpDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const { show } = await searchParams;
  const limit = Math.min(Math.max(Number(show) || PAGE, PAGE), 1000);
  const { rows, total } = await listAttendees(id, limit, 0);

  return (
    <div>
      <PageHeader title="芳名録" backHref={`/mypage/${id}`} />

      {/* ダウンロード */}
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`/mypage/${id}/attendees/export?fmt=csv`}
           className="inline-flex items-center gap-1.5 rounded border border-[#ccc] bg-white px-4 py-2.5 text-sm">
          <Download size={16} /> CSVダウンロード
        </a>
        <a href={`/mypage/${id}/attendees/export?fmt=txt`}
           className="inline-flex items-center gap-1.5 rounded border border-[#ccc] bg-white px-4 py-2.5 text-sm">
          <FileText size={16} /> TXTダウンロード
        </a>
      </div>

      {/* 一覧 */}
      {rows.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-center text-sm text-[#8a8a8a] shadow-sm">
          まだご記帳はありません。
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Link href={`/mypage/${id}/attendees/${a.id}`}
                    className="block rounded-lg bg-white p-4 shadow-sm transition hover:shadow-md">
                <p className="font-bold">{a.name} 様</p>
                <p className="mt-1 text-xs text-[#8a8a8a]">{jpDateTime(a.createdAt)}</p>
                {a.company && <p className="mt-1 text-sm text-[#6b6b6b]">{a.company}</p>}
                <p className="mt-1 text-sm text-[#6b6b6b]">
                  {[a.relation, a.imagePaths.length ? `画像:${a.imagePaths.length}枚` : null]
                    .filter(Boolean).join(", ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rows.length < total && (
        <div className="mt-4 text-center">
          <Link href={`/mypage/${id}/attendees?show=${limit + PAGE}`}
                className="inline-block rounded border border-[#ccc] bg-white px-6 py-3 text-sm">
            さらに表示（{rows.length}件目まで表示中 / 全{total}件）
          </Link>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={`/mypage/${id}/visitors`} className="text-sm text-[#1b2a4a] underline">
          入場記録へ
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}
