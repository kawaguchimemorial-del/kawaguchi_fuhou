import Link from "next/link";
import { EstimateForm } from "@/components/kanri/EstimateForm";
import { listProducts } from "@/lib/kanri/products";
export const metadata = { title: "見積作成" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ customer_id?: string }> };
export default async function NewEstimate({ searchParams }: SP){
  const { customer_id } = await searchParams;
  const products = await listProducts();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">見積作成</h1><Link href="/kanri/estimates" className="rounded border px-3 py-1.5 text-sm">一覧へ</Link></div>
      <EstimateForm products={products} defaultCustomerId={customer_id} />
    </div>
  );
}
