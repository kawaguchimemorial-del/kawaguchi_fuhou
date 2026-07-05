import { InvoiceImport } from "@/components/kanri/InvoiceImport";

export const metadata = { title: "請求書CSVインポート" };
export const dynamic = "force-dynamic";

export default function InvoiceImportPage() {
  return (
    <div>
      <div className="-m-5 mb-4 bg-[#2c8c6f] px-5 py-3"><h1 className="text-lg font-bold text-white">請求書</h1></div>
      <InvoiceImport />
    </div>
  );
}
