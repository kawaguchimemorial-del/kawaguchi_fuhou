import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/kanri/ProductForm";
import { getProduct, listProducts } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";
export const metadata = { title: "商品編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
export default async function EditProduct({ params }: Params) {
  const { id } = await params;
  const [product, products, supplierItems] = await Promise.all([getProduct(id), listProducts(), listMasterItems("supplier")]);
  if (!product) notFound();
  const kinds = [...new Set(products.map((p)=>p.productKind).filter(Boolean) as string[])];
  const suppliers = supplierItems.map((m) => m.name);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">商品編集</h1><Link href="/kanri/products" className="rounded border px-3 py-1.5 text-sm">一覧へ</Link></div>
      <ProductForm product={product} kinds={kinds} suppliers={suppliers} />
    </div>
  );
}
