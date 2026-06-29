import Link from "next/link";

type Params = { params: Promise<{ id: string }> };

// オンライン式場 入場一覧（閲覧数）。TODO(supabase): access_logs(action=view) から集計。
export default async function EntriesPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">入場一覧（閲覧数）</h1>
        <Link href={`/admin/ceremonies/${id}`} className="rounded border px-3 py-1.5 text-sm">葬儀詳細へ</Link>
      </div>
      <div className="rounded-lg bg-white p-10 text-center text-gray-400 shadow-sm">
        入場（閲覧）記録はまだありません。Supabase接続後に表示されます。
      </div>
    </div>
  );
}
