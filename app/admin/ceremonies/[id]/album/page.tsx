import Link from "next/link";
import { notFound } from "next/navigation";

import { AlbumManager } from "@/components/admin/AlbumManager";
import { getAdminMemorial } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// アルバム登録・編集（オンライン式場で公開する故人の思い出写真・最大30枚）
export default async function AlbumPage({ params }: Params) {
  const { id } = await params; // id = slug
  const m = await getAdminMemorial(id);
  if (!m) notFound();

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">故 {m.deceased.nameKanji} 儀　アルバム</h1>
        <Link href={`/admin/ceremonies/${id}`} className="rounded border px-4 py-2 text-sm">
          ← 葬儀詳細へ
        </Link>
      </div>

      {m.venue ? (
        <AlbumManager slug={id} initialPaths={m.venue.albumPaths ?? []} />
      ) : (
        <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
          この葬儀はオンライン式場が未設定のため、アルバムを登録できません。先にオンライン式場を設定してください。
        </div>
      )}
    </div>
  );
}
