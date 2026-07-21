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
  const [e, products, productSets, osonae, discounts, purposes, templates] = await Promise.all([
    getEstimate(id), listProducts({ excludeHiddenKinds: true }), listProductSets(),
    listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("purpose"), listMasterItems("estimate_template"),
  ]);
  if (!e) notFound();
  const initial: FormInitial = {
    id: e.id, constructionNo: e.estimateNo,
    customerId: e.customerId ?? undefined, customerName: e.customerName,
    deceasedName: deceasedFullName(e),
    deceasedLastName: e.deceased.lastName, deceasedFirstName: e.deceased.firstName,
    deceasedGender: e.deceased.gender, deceasedBirthDate: e.deceased.birthDate,
    deceasedDeathDate: e.deceased.deathDate, deceasedAge: e.deceased.age,
    deceasedRelation: e.mourner.relation,
    mournerLastName: e.mourner.lastName, mournerFirstName: e.mourner.firstName,
    mournerKana: e.mourner.kana, mournerPhone: e.mourner.phone,
    mournerPostcode: e.mourner.postcode, mournerPrefecture: e.mourner.prefecture,
    mournerCity: e.mourner.addressCity, mournerStreet: e.mourner.addressStreet, mournerBuilding: e.mourner.addressBuilding,
    wakeAt: e.wakeAt, funeralAt: e.funeralAt, venueName: e.venueName,
    addresseeKind: e.addresseeKind, addresseeLastName: e.addresseeLastName, addresseeFirstName: e.addresseeFirstName,
    addresseeHonorific: e.addresseeHonorific, addresseeLastNameKana: e.addresseeLastNameKana, addresseeFirstNameKana: e.addresseeFirstNameKana,
    addresseePostcode: e.addresseePostcode, addresseePrefecture: e.addresseePrefecture,
    addresseeCity: e.addresseeCity, addresseeStreet: e.addresseeStreet, addresseeBuilding: e.addresseeBuilding,
    title: e.title, memo: e.memo, date1: e.estimateOn, date2: e.estimateLimitOn,
    crematorium: e.crematoriumName, brand: e.brand, productSetId: e.productSetId,
    wakeMealCount: e.wakeMealCount, funeralMealCount: e.funeralMealCount, imibaraiFee: e.imibaraiFee,
    items: (e.items ?? []).map((it) => ({ lineKind: it.lineKind, productId: it.productId, name: it.name, unitPrice: it.unitPrice, quantity: it.quantity, isSetItem: it.isSetItem, hiddenPaper: it.hiddenPaper, priceIncludingTax: it.priceIncludingTax })),
    advance: e.advancePayment, issuerCompany: e.issuerCompany, chargedOrg: e.chargedOrg, chargedUser: e.chargedUser,
    staffName: e.staffName,
    preConsultation: e.isPreConsultation,
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">見積もり</h1></div>
      <p className="mb-3 font-bold text-gray-700">編集</p>
      <EstimateCreateForm initial={initial} products={products} productSets={productSets} osonae={osonae} discounts={discounts} purposes={purposes} templates={templates} />
    </div>
  );
}
