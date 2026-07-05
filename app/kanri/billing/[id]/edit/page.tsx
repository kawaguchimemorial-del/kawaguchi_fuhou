import { notFound } from "next/navigation";
import { EstimateCreateForm, type FormInitial } from "@/components/kanri/EstimateCreateForm";
import { getInvoice } from "@/lib/kanri/invoices";
import { listProducts, listProductSets } from "@/lib/kanri/products";
import { listMasterItems } from "@/lib/kanri/masters";

export const metadata = { title: "請求書編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export default async function EditInvoice({ params }: Params) {
  const { id } = await params;
  const [res, products, productSets, osonae, discounts, memorialServices, purposes, templates] = await Promise.all([
    getInvoice(id), listProducts(), listProductSets(),
    listMasterItems("rough_product_osonae"), listMasterItems("discounted_product"),
    listMasterItems("memorial_service"), listMasterItems("purpose"), listMasterItems("invoice_template"),
  ]);
  if (!res) notFound();
  const { invoice: iv, details } = res;
  const nm = (iv.invoiceTargetName ?? "").replace(/　/g, " ");
  const sp = nm.indexOf(" ");
  const initial: FormInitial = {
    id: iv.id, constructionNo: iv.constructionNo,
    customerId: iv.customerId ?? undefined, customerName: iv.customerName,
    deceasedName: iv.deceasedName,
    addresseeLastName: sp > 0 ? nm.slice(0, sp) : nm || undefined,
    addresseeFirstName: sp > 0 ? nm.slice(sp + 1) : undefined,
    title: iv.title, date1: iv.billedOn, date2: iv.dueOn,
    items: details.map((d) => ({ lineKind: d.amount < 0 ? "discount" as const : "item" as const, name: d.title, unitPrice: Math.abs(d.price), quantity: d.quantity })),
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書</h1></div>
      <p className="mb-3 font-bold text-gray-700">編集</p>
      <EstimateCreateForm asInvoice initial={initial} products={products} productSets={productSets} osonae={osonae} discounts={discounts} memorialServices={memorialServices} purposes={purposes} templates={templates} />
    </div>
  );
}
