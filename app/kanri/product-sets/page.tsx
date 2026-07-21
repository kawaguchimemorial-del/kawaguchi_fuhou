import Link from "next/link";
import { listProductSets } from "@/lib/kanri/products";
import { ProductSetReorder } from "@/components/kanri/ProductSetReorder";

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

      <ProductSetReorder sets={sets.map((st) => ({ id: st.id, code: st.code, name: st.name, price: st.price, taxIncludedPrice: st.taxIncludedPrice, tax: st.tax, hidden: st.hidden }))} />
    </div>
  );
}
