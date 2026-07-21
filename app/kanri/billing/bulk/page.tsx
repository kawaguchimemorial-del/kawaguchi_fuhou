import { BulkInvoiceForm } from "@/components/kanri/BulkInvoiceForm";
import { listProducts } from "@/lib/kanri/products";

export const metadata = { title: "請求書一括登録" };
export const dynamic = "force-dynamic";

export default async function BulkInvoicePage() {
  const products = await listProducts({ excludeHiddenKinds: true });
  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書一括登録</h1></div>
      <BulkInvoiceForm products={products} />
    </div>
  );
}
