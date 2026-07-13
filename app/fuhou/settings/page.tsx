import Link from "next/link";

// 贈答品の設定は今回非対応のため除外。
const ITEMS = [
  { href: "/fuhou/settings/company", title: "葬儀社管理", desc: "ご登録いただいている葬儀社情報の参照・編集ができます。" },
  { href: "/fuhou/settings/products", title: "供花・供物の設定・商品登録", desc: "支払い方法の設定や、商品の登録を行います。" },
  { href: "/fuhou/settings/mail", title: "メール設定", desc: "注文通知先や、自動送信メールの文言を設定します。" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold">設定</h1>
      <div className="space-y-3">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className="block rounded-lg bg-white p-5 shadow-sm hover:bg-[#f3e9f6]">
            <p className="font-medium text-[#9b2fae]">{i.title} ›</p>
            <p className="mt-1 text-sm text-gray-500">{i.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
