import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getKodenSettlement, listAttendees } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

// 芳名録。＠葬儀に倣い「香典精算テーブル → ダウンロード → 一覧(20件ずつ)」の順。

const PAGE = 20;
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function jpDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

const yen = (n: number) => n.toLocaleString("ja-JP");

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
  const [{ rows, total }, settlement] = await Promise.all([
    listAttendees(id, limit, 0),
    getKodenSettlement(id),
  ]);

  return (
    <div>
      <PageHeader title="芳名録" backHref={`/mypage/${id}`} />

      {/* 香典精算 */}
      <section className="mb-6 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">お香典（返礼品なし）</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left font-normal text-[#6b6b6b]">対象年月</th>
                {settlement.map((s) => (
                  <th key={s.month} className="py-2 px-3 text-right font-medium">
                    {s.month.slice(0, 4)}年<br />{s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-3 text-[#6b6b6b]">香典金額合計</td>
                {settlement.map((s) => <td key={s.month} className="py-2 px-3 text-right">{yen(s.total)}</td>)}
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3 text-[#6b6b6b]">香典決済代行手数料 (5%)</td>
                {settlement.map((s) => <td key={s.month} className="py-2 px-3 text-right">{yen(s.fee)}</td>)}
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3 font-medium">振込金額</td>
                {settlement.map((s) => <td key={s.month} className="py-2 px-3 text-right font-medium">{yen(s.payout)}</td>)}
              </tr>
              <tr>
                <td className="py-2 pr-3 text-[#6b6b6b]">振込予定日</td>
                {settlement.map((s) => <td key={s.month} className="py-2 px-3 text-right text-xs">{s.payoutDate}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#8a8a8a]">
          ※ 香典決済代行手数料は5%です。<br />
          ※ 振込日が祝・休日の場合は、翌営業日のお振り込みとなります。
        </p>
      </section>

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
                  {a.kodenAmount > 0 && (
                    <span className="ml-2 rounded bg-[#f0ece2] px-2 py-0.5 text-xs text-[#6b5b32]">
                      お香典 {yen(a.kodenAmount)}円
                    </span>
                  )}
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
