import Link from "next/link";
import { notFound } from "next/navigation";
import { masterDef, masterFields, masterLabel, listMasterItems, fieldValue } from "@/lib/kanri/masters";
import { addMasterItem, updateMasterItem, deleteMasterItem } from "@/lib/kanri/actions";
import { ProductKindReorder } from "@/components/kanri/ProductKindReorder";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ type: string }> };

export default async function MasterTypePage({ params }: Params) {
  const { type } = await params;
  const def = masterDef(type);
  if (!def) notFound();
  const fields = masterFields(type);
  const items = await listMasterItems(type);
  // selectFrom フィールド用の選択肢（例: 親の商品種別）
  const needKinds = fields.some((f) => f.selectFrom === "product_kind");
  const kindOptions = needKinds ? (await listMasterItems("product_kind")).map((m) => m.name) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{masterLabel(type)}</h1>
        <Link href="/kanri/settings" className="rounded border px-3 py-1.5 text-sm">設定へ</Link>
      </div>

      <form action={addMasterItem} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm text-sm">
        <input type="hidden" name="master_type" value={type} />
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500">{f.label}{f.col === "name" && <span className="ml-1 text-red-500">必須</span>}</label>
            {f.selectFrom === "product_kind" ? (
              <select name={`f_${f.key}`} defaultValue="" className="mt-1 w-44 rounded border px-3 py-2">
                <option value="">選択してください</option>
                {kindOptions.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            ) : (
              <input name={`f_${f.key}`} type={f.kind === "number" ? "number" : "text"} required={f.col === "name"} className="mt-1 w-44 rounded border px-3 py-2" />
            )}
          </div>
        ))}
        <button className="rounded bg-[#1aa39a] px-4 py-2 text-white">追加</button>
      </form>

      {type === "product_kind" ? (
        <ProductKindReorder type={type} items={items.map((it) => ({ id: it.id, name: it.name }))} />
      ) : (
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{fields.map((f) => <th key={f.key} className="px-3 py-2 font-medium">{f.label}</th>)}<th className="px-3 py-2" /></tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr><td colSpan={fields.length + 1} className="px-3 py-8 text-center text-gray-400">未登録です。</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  {fields.map((f) => (
                    <td key={f.key} className="px-3 py-2">
                      {f.selectFrom === "product_kind" ? (
                        <select form={`edit-${it.id}`} name={`f_${f.key}`} defaultValue={fieldValue(it, f) ?? ""} className="w-full min-w-[7rem] rounded border border-gray-200 px-2 py-1.5 focus:border-[#1aa39a] focus:outline-none">
                          <option value="">選択してください</option>
                          {kindOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      ) : (
                        <input
                          form={`edit-${it.id}`}
                          name={`f_${f.key}`}
                          type={f.kind === "number" ? "number" : "text"}
                          defaultValue={fieldValue(it, f) ?? ""}
                          required={f.col === "name"}
                          className="w-full min-w-[7rem] rounded border border-gray-200 px-2 py-1.5 focus:border-[#1aa39a] focus:outline-none"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <form id={`edit-${it.id}`} action={updateMasterItem} className="inline">
                      <input type="hidden" name="id" value={it.id} />
                      <input type="hidden" name="master_type" value={type} />
                      <button className="rounded bg-[#1aa39a] px-3 py-1 text-xs text-white hover:opacity-90">更新</button>
                    </form>
                    <form action={deleteMasterItem} className="ml-2 inline">
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
      )}
    </div>
  );
}
