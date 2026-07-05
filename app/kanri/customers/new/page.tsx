import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
import { CustomerForm } from "@/components/kanri/CustomerForm";

export const metadata = { title: "顧客 新規登録" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="顧客 新規登録" action={{ label: "一覧へ", href: "/kanri/customers" }} />
      <CustomerForm />
    </div>
  );
}
