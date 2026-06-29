import Link from "next/link";
import { getFuneralHomeName } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function CompanySettings() {
  const name = await getFuneralHomeName();
  return (
    <div className="mx-auto max-w-2xl">
      <Back />
      <h1 className="mb-6 text-xl font-bold">葬儀社管理</h1>
      <form className="space-y-5 rounded-lg bg-white p-6 shadow-sm">
        <Field label="葬儀社名" defaultValue={name} />
        <Field label="電話番号" defaultValue="0120-963-765" />
        <Field label="メールアドレス" defaultValue="kawaguchi.memorial@gmail.com" />
        <Field label="住所" defaultValue="埼玉県川口市西新井宿440-1" />
        <Field label="URL" defaultValue="https://kawaguchitenrei.com/" />
        <button type="button" className="rounded bg-[#9b2fae] px-6 py-2.5 text-sm text-white">保存する（準備中）</button>
      </form>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input defaultValue={defaultValue} className="mt-1 w-full border-b py-2 focus:border-[#9b2fae] focus:outline-none" />
    </label>
  );
}
function Back() {
  return <Link href="/admin/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>;
}
