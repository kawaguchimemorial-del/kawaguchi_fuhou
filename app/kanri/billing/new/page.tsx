import { EstimateCreateForm, type FormInitial } from "@/components/kanri/EstimateCreateForm";
import { getEstimate, deceasedFullName } from "@/lib/kanri/estimates";
import { listProducts, listProductSets } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";

export const metadata = { title: "請求書 登録" };
export const dynamic = "force-dynamic";
type SP = { searchParams: Promise<{ from_estimate?: string }> };

export default async function NewInvoice({ searchParams }: SP) {
  const sp = await searchParams;
  const [products, productSets, osonae, discounts, memorialServices, purposes, templates] = await Promise.all([
    listProducts(), listProductSets(), listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("memorial_service"), listMasterItems("purpose"), listMasterItems("invoice_template"),
  ]);
  // 見積から作成: 見積内容をプレフィル（顧客/宛名/件名/明細/セット/担当）
  let initial: FormInitial | undefined;
  if (sp.from_estimate) {
    const e = await getEstimate(sp.from_estimate);
    if (e) {
      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // JST今日
      initial = {
        estimateId: e.id, // 保存時に fk_invoices.estimate_id へ紐付け
        constructionNo: e.estimateNo,
        customerId: e.customerId ?? undefined, customerName: e.customerName,
        deceasedName: deceasedFullName(e),
        addresseeKind: e.addresseeKind, addresseeLastName: e.addresseeLastName, addresseeFirstName: e.addresseeFirstName,
        addresseeHonorific: e.addresseeHonorific, addresseeLastNameKana: e.addresseeLastNameKana, addresseeFirstNameKana: e.addresseeFirstNameKana,
        addresseePostcode: e.addresseePostcode, addresseePrefecture: e.addresseePrefecture,
        addresseeCity: e.addresseeCity, addresseeStreet: e.addresseeStreet, addresseeBuilding: e.addresseeBuilding,
        title: e.title, memo: e.memo, date1: today,
        productSetId: e.productSetId,
        items: (e.items ?? []).map((it) => ({ lineKind: it.lineKind, productId: it.productId, name: it.name, unitPrice: it.unitPrice, quantity: it.quantity, isSetItem: it.isSetItem, hiddenPaper: it.hiddenPaper, priceIncludingTax: it.priceIncludingTax })),
        advance: e.advancePayment, issuerCompany: e.issuerCompany, chargedOrg: e.chargedOrg, chargedUser: e.chargedUser,
        staffName: e.staffName,
      };
    }
  }
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書</h1></div>
      <p className="mb-3 font-bold text-gray-700">登録{initial ? "（見積もりから作成）" : ""}</p>
      <EstimateCreateForm asInvoice initial={initial} products={products} productSets={productSets} osonae={osonae} discounts={discounts} memorialServices={memorialServices} purposes={purposes} templates={templates} />
    </div>
  );
}
