import { notFound } from "next/navigation";
import { EstimateCreateForm, type FormInitial } from "@/components/kanri/EstimateCreateForm";
import { getEstimate, deceasedFullName } from "@/lib/kanri/estimates";
import { listProducts, listProductSets } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";

export const metadata = { title: "見積編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export default async function EditEstimate({ params }: Params) {
  const { id } = await params;
  const [e, products, productSets, osonae, discounts, memorialServices, purposes, templates] = await Promise.all([
    getEstimate(id), listProducts(), listProductSets(),
    listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("memorial_service"), listMasterItems("purpose"), listMasterItems("estimate_template"),
  ]);
  if (!e) notFound();
  const initial: FormInitial = {
    id: e.id, constructionNo: e.estimateNo,
    customerId: e.customerId ?? undefined, customerName: e.customerName,
    deceasedName: deceasedFullName(e),
    addresseeKind: e.addresseeKind, addresseeLastName: e.addresseeLastName, addresseeFirstName: e.addresseeFirstName,
    addresseeHonorific: e.addresseeHonorific, addresseeLastNameKana: e.addresseeLastNameKana, addresseeFirstNameKana: e.addresseeFirstNameKana,
    addresseePostcode: e.addresseePostcode, addresseePrefecture: e.addresseePrefecture,
    addresseeCity: e.addresseeCity, addresseeStreet: e.addresseeStreet, addresseeBuilding: e.addresseeBuilding,
    title: e.title, memo: e.memo, date1: e.estimateOn, date2: e.estimateLimitOn,
    crematorium: e.crematoriumName, brand: e.brand, productSetId: e.productSetId,
    items: (e.items ?? []).map((it) => ({ lineKind: it.lineKind, productId: it.productId, name: it.name, unitPrice: it.unitPrice, quantity: it.quantity })),
    advance: e.advancePayment, issuerCompany: e.issuerCompany, chargedOrg: e.chargedOrg, chargedUser: e.chargedUser,
    staffName: e.staffName,
    preConsultation: e.isPreConsultation,
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">見積もり</h1></div>
      <p className="mb-3 font-bold text-gray-700">編集</p>
      <EstimateCreateForm initial={initial} products={products} productSets={productSets} osonae={osonae} discounts={discounts} memorialServices={memorialServices} purposes={purposes} templates={templates} />
    </div>
  );
}
