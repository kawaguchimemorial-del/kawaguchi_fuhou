import { getAppSetting } from "@/lib/kanri/masters";
import { saveAppSetting } from "@/lib/kanri/actions";

export const metadata = { title: "CRM入力必須項目設定" };
export const dynamic = "force-dynamic";

// 当システムで実際に使用しているフィールドの必須設定
const GROUPS: { label: string; fields: string[] }[] = [
  { label: "顧客", fields: ["顧客氏", "顧客セイ", "顧客名", "顧客メイ", "ステータス", "流入経路", "性別", "生年月日", "自宅番号", "携帯番号", "メールアドレス", "郵便番号", "住所"] },
  { label: "対象者（故人）", fields: ["対象者氏", "対象者名", "カナ", "性別", "享年", "没日"] },
  { label: "喪主", fields: ["喪主 氏", "喪主 名", "カナ", "続柄", "電話番号", "住所"] },
  { label: "見積・請求", fields: ["件名", "見積日", "請求日", "お支払い期限"] },
];

export default async function RequiredFieldsPage() {
  const saved = await getAppSetting("required_fields");
  const hasSaved = Object.keys(saved).length > 0;
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">CRM入力必須項目設定</h1></div>
      <form action={saveAppSetting} className="space-y-5">
        <input type="hidden" name="setting_key" value="required_fields" />
        <input type="hidden" name="back" value="/kanri/settings/required-fields" />
        <div className="grid gap-4 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.label} className="rounded-lg bg-white p-4 shadow-sm">
              <p className="mb-2 border-b pb-2 text-sm font-bold text-gray-700">{g.label}</p>
              <div className="space-y-1">
                {g.fields.map((f) => {
                  const key = `${g.label}_${f}`;
                  const checked = hasSaved ? saved[key] === "on" : false;
                  return <label key={f} className="flex items-center gap-2 px-2 text-sm text-gray-700"><input type="checkbox" name={key} defaultChecked={checked} /> {f}</label>;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white">更新する</button>
          <a href="/kanri/settings" className="rounded border px-6 py-2.5 text-sm text-gray-600">キャンセル</a>
        </div>
      </form>
    </div>
  );
}
