import { notFound } from "next/navigation";
import { ProductSetForm } from "@/components/kanri/ProductSetForm";
import { getProductSet, listProducts } from "@/lib/kanri/products";

export const metadata = { title: "セット商品編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export default async function EditProductSet({ params }: Params) {
  const { id } = await params;
  const [set, products] = await Promise.all([getProductSet(id), listProducts()]);
  if (!set) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">セット商品編集</h1></div>
      <ProductSetForm set={set} products={products} />
    </div>
  );
}
