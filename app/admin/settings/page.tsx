import Link from "next/link";

const ITEMS = [
  { title: "葬儀社管理", desc: "ご登録いただいている葬儀社情報の参照・編集ができます。" },
  { title: "ユーザー管理", desc: "葬儀社内のユーザーの登録・編集・削除ができます。" },
  { title: "供花・供物の設定・商品登録", desc: "支払い方法の設定や、商品の登録を行います。" },
  { title: "贈答品の設定・商品登録", desc: "支払い方法の設定や、商品の登録を実施します。" },
  { title: "メール設定（注文通知先・自動送信文言）", desc: "EC注文の通知先や、自動送信メールの任意文言を設定します。" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold">設定</h1>
      <div className="space-y-3">
        {ITEMS.map((i) => (
          <Link key={i.title} href="#" className="block rounded-lg bg-white p-5 shadow-sm hover:bg-[#f3e9f6]">
            <p className="font-medium">{i.title}</p>
            <p className="mt-1 text-sm text-gray-500">{i.desc}</p>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">※ 各設定の編集UIは順次実装します。</p>
    </div>
  );
}
