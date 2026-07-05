import Link from "next/link";
import { listProductSets } from "@/lib/kanri/products";
import { deleteProductSet } from "@/lib/kanri/actions";

export const metadata = { title: "セット商品" };
export const dynamic = "force-dynamic";

export default async function ProductSetsPage() {
  const sets = await listProductSets();
  return (
    <div>
      <div className="-m-5 mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#2c8c6f] px-5 py-3">
        <h1 className="text-lg font-bold text-white">セット商品</h1>
        <div className="flex gap-2 text-xs">
          <a href="/kanri/product-sets/export" className="rounded bg-white/15 px-3 py-1.5 text-white hover:bg-white/25">CSVエクスポート</a>
          <Link href="/kanri/product-sets/new" className="rounded bg-white px-3 py-1.5 font-medium text-[#2c8c6f]">セット商品 追加</Link>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <div className="border-b px-4 py-3"><p className="text-sm font-bold">一覧　<span className="font-normal text-gray-500">{sets.length} 件</span></p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-600"><tr>{["セット商品コード", "セット名", "セット価格(税抜)", "セット価格(税込)", "消費税率", "非表示", "操作"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y">
              {sets.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">セット商品がありません。</td></tr> :
                sets.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{st.code ?? "—"}</td>
                    <td className="px-4 py-2 font-medium">{st.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">{st.price.toLocaleString()}円</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">{st.taxIncludedPrice.toLocaleString()}円</td>
                    <td className="px-4 py-2">{Math.round(st.tax * 100)}%</td>
                    <td className="px-4 py-2">{st.hidden ? "非表示" : ""}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Link href={`/kanri/product-sets/${st.id}/edit`} className="rounded border border-[#1aa39a] px-2 py-1 text-[11px] text-[#1aa39a]">編集</Link>
                        <form action={deleteProductSet}><input type="hidden" name="id" value={st.id} /><button className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500">削除</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
