import Link from "next/link";
import { getCompanyInfo } from "@/lib/kanri/masters";

export const dynamic = "force-dynamic";

// 葬儀社情報は葬儀管理(/kanri)の会社情報マスタを参照する読み取り専用画面。
// 編集は /kanri/settings/company で行う(二重管理を避けるため保存機能なし)。
export default async function CompanySettings() {
  const co = await getCompanyInfo();
  const addr = [co.prefecture, co.address_city, co.address_street, co.address_building].filter(Boolean).join("");
  const rows: [string, string][] = [
    ["葬儀社名", co.company_name || "株式会社 川口典礼"],
    ["電話番号", co.tel || "—"],
    ["FAX", co.fax || "—"],
    ["メールアドレス", co.email || "—"],
    ["郵便番号", co.postcode ? `〒${co.postcode}` : "—"],
    ["住所", addr || "—"],
    ["適格事業者番号", co.invoice_no || "—"],
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/fuhou/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <h1 className="mb-2 text-xl font-bold">葬儀社管理</h1>
      <p className="mb-6 rounded bg-amber-50 px-4 py-3 text-sm text-amber-800">
        この情報は葬儀管理システムの「会社情報」を表示しています。変更する場合は
        <Link href="/kanri/settings/company" className="mx-1 underline">葬儀管理 › 設定 › 会社情報</Link>
        で編集してください（ここでは保存できません）。
      </p>
      <div className="divide-y rounded-lg bg-white shadow-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 px-6 py-3.5 text-sm">
            <span className="w-36 shrink-0 text-gray-500">{label}</span>
            <span className="text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
