import { notFound } from "next/navigation";
import { PageHeader } from "@/components/kanri/PageHeader";
import { CustomerForm } from "@/components/kanri/CustomerForm";
import { getCustomer } from "@/lib/kanri/data";
export const metadata = { title: "顧客 編集" };
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
export default async function EditCustomer({ params }: Params){
  const { id } = await params;
  const c = await getCustomer(id);
  if(!c) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="顧客 編集" action={{ label: "詳細へ", href: `/kanri/customers/${id}` }} />
      <CustomerForm customer={c} />
    </div>
  );
}
