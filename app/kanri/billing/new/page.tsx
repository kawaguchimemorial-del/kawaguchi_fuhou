import { EstimateForm } from "@/components/kanri/EstimateForm";
import { listProducts } from "@/lib/kanri/products";

export const metadata = { title: "請求書追加" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ customer_id?: string }> };

export default async function NewInvoice({ searchParams }: SP) {
  const { customer_id } = await searchParams;
  const products = await listProducts();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書</h1></div>
      <p className="mb-3 font-bold text-gray-700">登録</p>
      <EstimateForm products={products} defaultCustomerId={customer_id} asInvoice />
    </div>
  );
}
