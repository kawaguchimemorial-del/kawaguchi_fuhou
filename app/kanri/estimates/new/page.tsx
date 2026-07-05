import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
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
      <PageHeader title="見積作成" action={{ label: "一覧へ", href: "/kanri/estimates" }} />
      <EstimateForm products={products} defaultCustomerId={customer_id} />
    </div>
  );
}
