import Link from "next/link";
import { CustomerForm } from "@/components/kanri/CustomerForm";

export const metadata = { title: "顧客 新規登録" };

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">顧客 新規登録</h1>
        <Link href="/kanri/customers" className="rounded border px-3 py-1.5 text-sm">一覧へ</Link>
      </div>
      <CustomerForm />
    </div>
  );
}
