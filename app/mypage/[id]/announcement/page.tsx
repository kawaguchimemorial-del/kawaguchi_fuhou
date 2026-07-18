import { notFound, redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getMournerMemorial } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { CopyLinkRow } from "@/components/mourner/CopyLinkRow";
import { publicBaseUrl } from "@/lib/mourner/urls";

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");
  const memorial = await getMournerMemorial(id);
  if (!memorial) notFound();

  const base = await publicBaseUrl();
  const obituaryUrl = `${base}/m/${memorial.slug}`;
  const venueUrl = `${base}/m/${memorial.slug}/venue`;

  return (
    <div>
      <PageHeader title="参列者へのご案内" backHref={`/mypage/${id}`} />

      <p className="mb-6 text-sm leading-relaxed text-[#6b6b6b]">
        参列者様に訃報ページ・葬儀式場をお知らせする際は、「URLをコピーする」ボタンを押してコピーしていただくか、
        各ページを開いて共有ボタンをご利用ください。
      </p>

      <CopyLinkRow label="訃報ページ" url={obituaryUrl} />
      <CopyLinkRow label="オンライン式場ページ" url={venueUrl} />

      <SiteFooter />
    </div>
  );
}
