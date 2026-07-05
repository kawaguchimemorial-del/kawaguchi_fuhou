import { getAppSetting } from "@/lib/kanri/masters";
import { saveAppSetting } from "@/lib/kanri/actions";

export const metadata = { title: "購入に関する通知設定" };
export const dynamic = "force-dynamic";

const NOTICES = [
  { key: "order_created", label: "供花・供物の注文があったとき" },
  { key: "payment_completed", label: "決済が完了したとき" },
  { key: "order_canceled", label: "注文がキャンセルされたとき" },
];

export default async function PurchaseNoticePage() {
  const saved = await getAppSetting("purchase_notice");
  const hasSaved = Object.keys(saved).length > 0;
  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">購入に関する通知設定</h1></div>
      <form action={saveAppSetting} className="max-w-2xl space-y-5">
        <input type="hidden" name="setting_key" value="purchase_notice" />
        <input type="hidden" name="back" value="/kanri/settings/purchase-notice" />
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="mb-3 border-b pb-2 text-sm font-bold text-gray-700">通知するタイミング</p>
          <div className="space-y-2">
            {NOTICES.map((n) => {
              const checked = hasSaved ? saved[n.key] === "on" : true;
              return <label key={n.key} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name={n.key} defaultChecked={checked} /> {n.label}</label>;
            })}
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm text-gray-600">通知先メールアドレス（カンマ区切りで複数可）</label>
            <input name="emails" defaultValue={saved.emails ?? ""} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="example@kawaguchi-tenrei.jp" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded bg-[#2c8c6f] px-6 py-2.5 text-sm text-white">更新する</button>
          <a href="/kanri/settings" className="rounded border px-6 py-2.5 text-sm text-gray-600">キャンセル</a>
        </div>
      </form>
    </div>
  );
}
