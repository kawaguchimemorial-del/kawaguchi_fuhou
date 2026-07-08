import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/kanri/invoices";
import { deceasedFullName } from "@/lib/kanri/estimates";
import { PaymentSlipForm } from "@/components/kanri/PaymentSlipForm";

export const metadata = { title: "伝票発行" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export default async function NewSlipPage({ params }: Params) {
  const { id } = await params;
  const res = await getInvoice(id);
  if (!res) notFound();
  const { invoice: iv, estimate: e } = res;
  const title = e ? `${deceasedFullName(e)}様ご葬儀` : "";
  const remaining = iv.total - iv.paidTotal;
  const today = new Date().toISOString().slice(0, 10);
  // 請求書の情報から伝票の初期値を組み立てる（入れられる内容は入れておく）
  const prefill = {
    note: iv.title ?? e?.title ?? title,                       // 但し書き = 請求件名
    performanceNo: iv.constructionNo ?? e?.estimateNo ?? "",    // 施行番号
    addressee: iv.invoiceTargetName || iv.mournerName || iv.customerName || "", // 宛名(請求先→喪主→顧客)
    issuerCompany: iv.issuerCompany ?? "株式会社 川口典礼",       // 発行会社
    summary: iv.title ?? "",                                    // 摘要
    remaining, today,
  };

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書:{title}</h1></div>
      <PaymentSlipForm invoiceId={iv.id} prefill={prefill} />
    </div>
  );
}
