import Link from "next/link";
import { getCompanyInfo } from "@/lib/kanri/masters";
import { CompanyForm } from "@/components/kanri/CompanyForm";
export const metadata = { title: "会社情報" };
export const dynamic = "force-dynamic";
export default async function CompanyPage(){
  const values = await getCompanyInfo();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">会社情報</h1><Link href="/kanri/settings" className="rounded border px-3 py-1.5 text-sm">設定へ</Link></div>
      <p className="text-sm text-gray-500">見積書・請求書・領収書に表示される会社情報を登録します。</p>
      <CompanyForm values={values} />
    </div>
  );
}
