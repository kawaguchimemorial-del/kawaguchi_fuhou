import Link from "next/link";
import { notFound } from "next/navigation";
import { MASTER_TYPES, masterLabel, listMasterItems } from "@/lib/kanri/masters";
import { addMasterItem, deleteMasterItem } from "@/lib/kanri/actions";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ type: string }> };

export default async function MasterTypePage({ params }: Params) {
  const { type } = await params;
  const def = MASTER_TYPES.find((m) => m.type === type);
  if (!def) notFound();
  const items = await listMasterItems(type);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{masterLabel(type)}</h1>
        <Link href="/kanri/settings" className="rounded border px-3 py-1.5 text-sm">設定へ</Link>
      </div>

      {/* 追加フォーム */}
      <form action={addMasterItem} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm text-sm">
        <input type="hidden" name="master_type" value={type} />
        <div>
          <label className="block text-xs text-gray-500">名称 <span className="text-red-500">必須</span></label>
          <input name="name" required className="mt-1 w-56 rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">カナ</label>
          <input name="kana" className="mt-1 w-40 rounded border px-3 py-2" />
        </div>
        {def.hasPrice && (
          <div>
            <label className="block text-xs text-gray-500">金額</label>
            <input name="price" type="number" className="mt-1 w-28 rounded border px-3 py-2" />
          </div>
        )}
        <button className="rounded bg-[#9b2fae] px-4 py-2 text-white">追加</button>
      </form>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 font-medium">名称</th>
              <th className="px-3 py-2 font-medium">カナ</th>
              {def.hasPrice && <th className="px-3 py-2 font-medium">金額</th>}
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">未登録です。</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-gray-500">{it.kana ?? ""}</td>
                  {def.hasPrice && <td className="px-3 py-2">{it.price != null ? `${it.price.toLocaleString()}円` : ""}</td>}
                  <td className="px-3 py-2 text-right">
                    <form action={deleteMasterItem}>
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="master_type" value={type} />
                      <button className="text-xs text-red-500 hover:underline">削除</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
