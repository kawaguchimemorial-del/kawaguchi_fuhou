import { getAppSetting } from "@/lib/kanri/masters";
import { saveAppSetting } from "@/lib/kanri/actions";

export const metadata = { title: "項目の表示、非表示設定" };
export const dynamic = "force-dynamic";

// 当システムで実際に使用しているフィールドをセクション別に定義
const SECTIONS: { title: string; groups: { label: string; fields: string[] }[] }[] = [
  { title: "顧客", groups: [
    { label: "顧客", fields: ["顧客氏", "顧客セイ", "顧客名", "顧客メイ", "ステータス", "流入経路", "顧客担当", "性別", "生年月日", "自宅番号", "携帯番号", "FAX番号", "メールアドレス", "郵便番号", "都道府県", "市区町村", "番地", "建物名など", "その他備考", "顧客ランク", "顧客番号", "問い合わせ理由"] },
  ] },
  { title: "葬家", groups: [
    { label: "基本情報", fields: ["施行番号", "件名", "宗教・宗旨", "摘要"] },
    { label: "対象者情報", fields: ["対象者氏", "対象者名", "対象者氏（カナ）", "対象者名（カナ）", "性別", "享年", "生年月日", "没日"] },
    { label: "喪主情報", fields: ["喪主 氏", "喪主 名", "カナ", "続柄", "電話番号", "郵便番号", "都道府県", "市区町村", "番地", "建物名など"] },
    { label: "葬儀・告別式", fields: ["通夜日時", "葬儀日時", "式場", "式場住所", "火葬場"] },
  ] },
  { title: "請求書", groups: [
    { label: "請求書情報", fields: ["請求日", "お支払い期限", "前受金", "発行会社", "計上組織", "計上担当者"] },
  ] },
];

export default async function FieldVisibilityPage() {
  const saved = await getAppSetting("field_visibility");
  const hasSaved = Object.keys(saved).length > 0;
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">項目の表示、非表示設定</h1></div>
      <form action={saveAppSetting} className="space-y-5">
        <input type="hidden" name="setting_key" value="field_visibility" />
        <input type="hidden" name="back" value="/kanri/settings/field-visibility" />
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-3 border-b pb-2 font-bold text-gray-700">{sec.title}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              {sec.groups.map((g) => (
                <div key={g.label} className="rounded border border-gray-200 p-3">
                  <p className="mb-2 border-b bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600">{g.label}</p>
                  <div className="space-y-1">
                    {g.fields.map((f) => {
                      const key = `${sec.title}_${g.label}_${f}`;
                      const checked = hasSaved ? saved[key] === "on" : false;
                      return <label key={f} className="flex items-center gap-2 px-2 text-sm text-gray-700"><input type="checkbox" name={key} defaultChecked={checked} /> {f}</label>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <button className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white">更新する</button>
          <a href="/kanri/settings" className="rounded border px-6 py-2.5 text-sm text-gray-600">キャンセル</a>
        </div>
      </form>
    </div>
  );
}
