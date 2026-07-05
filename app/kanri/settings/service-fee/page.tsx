import { listMasterItems, getAppSetting } from "@/lib/kanri/masters";
import { saveAppSetting } from "@/lib/kanri/actions";

export const metadata = { title: "サービス利用料" };
export const dynamic = "force-dynamic";

export default async function ServiceFeePage() {
  const [kinds, fees] = await Promise.all([listMasterItems("product_kind"), getAppSetting("service_fee")]);
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">サービス利用料</h1></div>
      <p className="mb-3 font-bold text-gray-700">サービス利用料一覧</p>
      <form action={saveAppSetting} className="rounded-lg bg-white p-4 shadow-sm">
        <input type="hidden" name="setting_key" value="service_fee" />
        <input type="hidden" name="back" value="/kanri/settings/service-fee" />
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-gray-600"><tr>{["種別", "サービス利用料率", ""].map((h, i) => <th key={i} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y">
            {kinds.length === 0 ? <tr><td colSpan={3} className="px-3 py-8 text-center text-gray-400">商品種別が登録されていません。</td></tr> :
              kinds.map((k) => (
                <tr key={k.id} className="odd:bg-gray-50/60">
                  <td className="px-3 py-2.5">商品:{k.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      <input name={`rate_${k.id}`} defaultValue={fees[`rate_${k.id}`] ?? "0"} inputMode="numeric" className="w-16 rounded border border-gray-300 px-2 py-1 text-right" />%
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><button className="rounded border border-[#2c8c6f] px-3 py-1 text-xs text-[#2c8c6f]">編集</button></td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="mt-4"><a href="/kanri/settings" className="rounded border px-4 py-2 text-sm text-gray-600">‹ 戻る</a></div>
      </form>
    </div>
  );
}
