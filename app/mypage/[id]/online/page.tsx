import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getMournerMemorial } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { GreetingEditor } from "@/components/mourner/GreetingEditor";
import { DEFAULT_GREETING } from "@/lib/mourner/greeting";
import { publicBaseUrl } from "@/lib/mourner/urls";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

function jpDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${p(d.getMonth() + 1)}月${p(d.getDate())}日(${WD[d.getDay()]}) ${p(d.getHours())}時${p(d.getMinutes())}分`;
}

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export default async function OnlinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const m = await getMournerMemorial(id);
  if (!m) notFound();

  const venueUrl = `${await publicBaseUrl()}/m/${m.slug}/venue`;
  const days = daysBetween(m.publicFrom, m.publicUntil);

  return (
    <div>
      <PageHeader title="オンライン式場詳細" backHref={`/mypage/${id}`} />

      <GreetingEditor memorialId={id} initial={m.greeting ?? DEFAULT_GREETING} />

      <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">オンライン式場URL</h2>
        <p className="mb-3 break-all text-sm text-[#6b6b6b]">{venueUrl}</p>
        <a href={venueUrl} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-1.5 rounded bg-[#1b2a4a] px-4 py-2.5 text-sm text-white">
          <ExternalLink size={16} /> オンライン式場を開く
        </a>
      </section>

      <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">公開期間</h2>
        <p className="text-sm leading-relaxed">
          {jpDateTime(m.publicFrom)} ~ {jpDateTime(m.publicUntil)}
          {days != null && <span className="ml-1 text-[#6b6b6b]">（{days}日間）</span>}
        </p>
        <p className="mt-3 text-xs text-[#8a8a8a]">
          公開期間の変更をご希望の場合は、葬儀社へお問い合わせください。
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
