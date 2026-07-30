import { redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { listPhotos, getMournerMemorial } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { PhotoManager } from "@/components/mourner/PhotoManager";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");
  // オンライン式場が無い案件では、この画面自体を出さない
  const mm = await getMournerMemorial(id);
  if (!mm?.hasVenue) redirect(`/mypage/${id}`);
  const photos = await listPhotos(id, "album");

  return (
    <div>
      <PageHeader title="アルバム編集" backHref={`/mypage/${id}`} />
      <p className="mb-4 text-sm text-[#6b6b6b]">オンライン式場に表示する、故人の思い出写真です。</p>
      <PhotoManager memorialId={id} kind="album" initial={photos} />
      <SiteFooter />
    </div>
  );
}
