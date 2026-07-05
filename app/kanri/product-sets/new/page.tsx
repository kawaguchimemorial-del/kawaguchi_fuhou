import { ProductSetForm } from "@/components/kanri/ProductSetForm";
import { listProducts } from "@/lib/kanri/products";

export const metadata = { title: "セット商品追加" };
export const dynamic = "force-dynamic";

export default async function NewProductSet() {
  const products = await listProducts();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">セット商品追加</h1></div>
      <ProductSetForm products={products} />
    </div>
  );
}
