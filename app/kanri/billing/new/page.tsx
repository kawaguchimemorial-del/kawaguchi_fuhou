import { EstimateCreateForm } from "@/components/kanri/EstimateCreateForm";
import { listProducts, listProductSets } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";

export const metadata = { title: "請求書 登録" };
export const dynamic = "force-dynamic";

export default async function NewInvoice() {
  const [products, productSets, osonae, discounts, memorialServices, purposes, templates] = await Promise.all([
    listProducts(), listProductSets(), listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("memorial_service"), listMasterItems("purpose"), listMasterItems("invoice_template"),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書</h1></div>
      <p className="mb-3 font-bold text-gray-700">登録</p>
      <EstimateCreateForm asInvoice products={products} productSets={productSets} osonae={osonae} discounts={discounts} memorialServices={memorialServices} purposes={purposes} templates={templates} />
    </div>
  );
}
