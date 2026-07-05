import Link from "next/link";
import { notFound } from "next/navigation";
import { EstimateForm } from "@/components/kanri/EstimateForm";
import { getEstimate } from "@/lib/kanri/estimates";
import { listProducts } from "@/lib/kanri/products";
export const metadata = { title: "見積編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
export default async function EditEstimate({ params }: Params){
  const { id } = await params;
  const [estimate, products] = await Promise.all([getEstimate(id), listProducts()]);
  if(!estimate) notFound();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">見積編集</h1><Link href={`/kanri/estimates/${id}`} className="rounded border px-3 py-1.5 text-sm">詳細へ</Link></div>
      <EstimateForm products={products} estimate={estimate} />
    </div>
  );
}
