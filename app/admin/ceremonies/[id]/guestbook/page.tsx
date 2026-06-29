import Link from "next/link";

type Params = { params: Promise<{ id: string }> };

// 芳名録（記帳・焼香・メッセージ）。TODO(supabase): virtual_worships/condolence_messages から取得。
export default async function GuestbookPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">芳名録</h1>
        <div className="flex gap-2 text-sm">
          <a href={`/admin/ceremonies/${id}/orders/export?kind=guestbook&fmt=csv`} className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">CSVダウンロード</a>
          <Link href={`/admin/ceremonies/${id}`} className="rounded border px-3 py-1.5">葬儀詳細へ</Link>
        </div>
      </div>
      <div className="rounded-lg bg-white p-10 text-center text-gray-400 shadow-sm">
        記帳・お焼香・メッセージはまだありません。Supabase接続後に表示されます。
      </div>
    </div>
  );
}
