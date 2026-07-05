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

  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書:{title}</h1></div>
      <PaymentSlipForm invoiceId={iv.id} invoiceTitle={e?.title ?? title} remaining={remaining} today={today} />
    </div>
  );
}
