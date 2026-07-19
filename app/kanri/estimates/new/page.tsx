import { EstimateCreateWithIntake } from "@/components/kanri/EstimateCreateWithIntake";
import { listProducts, listProductSets } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";

export const metadata = { title: "見積もり 登録" };
export const dynamic = "force-dynamic";

export default async function NewEstimate() {
  const [products, productSets, osonae, discounts, purposes, templates] = await Promise.all([
    listProducts(), listProductSets(), listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("purpose"), listMasterItems("estimate_template"),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">見積もり</h1></div>
      <p className="mb-3 font-bold text-gray-700">登録</p>
      <EstimateCreateWithIntake products={products} productSets={productSets} osonae={osonae} discounts={discounts} purposes={purposes} templates={templates} />
    </div>
  );
}
