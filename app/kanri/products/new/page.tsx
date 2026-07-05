import Link from "next/link";
import { ProductForm } from "@/components/kanri/ProductForm";
import { listProducts } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";
export const metadata = { title: "商品登録" };
export const dynamic = "force-dynamic";
export default async function NewProduct() {
  const [products, supplierItems] = await Promise.all([listProducts(), listMasterItems("supplier")]);
  const kinds = [...new Set(products.map((p)=>p.productKind).filter(Boolean) as string[])];
  const suppliers = supplierItems.map((m) => m.name);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">商品登録</h1><Link href="/kanri/products" className="rounded border px-3 py-1.5 text-sm">一覧へ</Link></div>
      <ProductForm kinds={kinds} suppliers={suppliers} />
    </div>
  );
}
