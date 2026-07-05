import Link from "next/link";
import { listProducts } from "@/lib/kanri/products";
import { deleteProduct } from "@/lib/kanri/actions";

export const metadata = { title: "商品" };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">商品</h1>
        <Link href="/kanri/products/new" className="rounded bg-[#9b2fae] px-4 py-2 text-sm text-white">＋ 商品登録</Link>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-600">
            <tr>{["種別","商品名","単価(税抜)","税率","単位","発注先",""].map((h)=><th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {products.length===0 ? (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">商品が登録されていません。</td></tr>
            ) : products.map((p)=>(
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.productKind ?? "—"}</td>
                <td className="px-3 py-2"><Link href={`/kanri/products/${p.id}/edit`} className="text-[#9b2fae] underline">{p.name}</Link></td>
                <td className="px-3 py-2">{p.unitPrice.toLocaleString()}円</td>
                <td className="px-3 py-2">{Math.round(p.taxRate*100)}%</td>
                <td className="px-3 py-2 text-gray-500">{p.unit ?? ""}</td>
                <td className="px-3 py-2 text-gray-500">{p.supplier ?? ""}</td>
                <td className="px-3 py-2 text-right">
                  <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><button className="text-xs text-red-500 hover:underline">削除</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">{products.length} 件</p>
    </div>
  );
}
