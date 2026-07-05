import { PageHeader } from "@/components/kanri/PageHeader";
import { CustomerImport } from "@/components/kanri/CustomerImport";
export const metadata = { title: "顧客CSVインポート" };
export default function Page(){
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="顧客CSVインポート" action={{ label: "一覧へ", href: "/kanri/customers" }} />
      <CustomerImport />
    </div>
  );
}
