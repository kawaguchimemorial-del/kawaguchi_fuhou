import Link from "next/link";
import { listCeremonies } from "@/lib/admin/data";
import { CeremonyList } from "@/components/admin/CeremonyList";

// 作成直後の案件を常に反映するため動的レンダリング
export const dynamic = "force-dynamic";

export default async function CeremoniesPage() {
  const rows = await listCeremonies();
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">葬儀一覧</h1>
        <Link
          href="/admin/ceremonies/new?type=obituary_venue"
          className="rounded-md bg-[#9b2fae] px-4 py-2 text-sm text-white"
        >
          ＋ 新しい葬儀を作成する
        </Link>
      </div>

      <CeremonyList rows={rows} />
    </div>
  );
}
