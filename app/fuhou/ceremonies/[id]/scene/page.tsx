import Link from "next/link";
import { notFound } from "next/navigation";

import { AlbumManager } from "@/components/admin/AlbumManager";
import { getAdminMemorial } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// 葬儀の様子（オンライン式場で公開する葬儀当日の写真・最大30枚）
export default async function ScenePage({ params }: Params) {
  const { id } = await params; // id = slug
  const m = await getAdminMemorial(id);
  if (!m) notFound();

  // 旧・単写真(ceremonyPhotoPath)からの移行：scenePaths が空なら初期表示に取り込む
  const initial =
    m.venue?.scenePaths && m.venue.scenePaths.length > 0
      ? m.venue.scenePaths
      : m.venue?.ceremonyPhotoPath
      ? [m.venue.ceremonyPhotoPath]
      : [];

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">故 {m.deceased.nameKanji} 儀　葬儀の様子</h1>
        <Link href={`/fuhou/ceremonies/${id}`} className="rounded border px-4 py-2 text-sm">
          ← 葬儀詳細へ
        </Link>
      </div>

      {m.venue ? (
        <AlbumManager
          slug={id}
          initialPaths={initial}
          field="scenePaths"
          lead="葬儀の様子の写真"
          note="アップロードした写真はオンライン式場の「葬儀の様子」に表示されます。"
        />
      ) : (
        <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
          この葬儀はオンライン式場が未設定のため、葬儀の様子を登録できません。先にオンライン式場を設定してください。
        </div>
      )}
    </div>
  );
}
