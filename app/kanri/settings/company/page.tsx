import Link from "next/link";
import { PageHeader } from "@/components/kanri/PageHeader";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { CompanyForm } from "@/components/kanri/CompanyForm";
export const metadata = { title: "会社情報" };
export const dynamic = "force-dynamic";
export default async function CompanyPage(){
  const values = await getCompanyInfo();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="会社情報" action={{ label: "設定へ", href: "/kanri/settings" }} />
      <p className="text-sm text-gray-500">見積書・請求書・領収書に表示される会社情報を登録します。</p>
      <CompanyForm values={values} />
    </div>
  );
}
