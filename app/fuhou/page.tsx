import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* 作成ボタン(本番のみ・テスト作成は廃止) */}
      <div className="mb-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/fuhou/ceremonies/new?type=obituary"
          className="rounded-md bg-[#9b2fae] px-6 py-3 text-white hover:opacity-90"
        >
          ＋ 訃報を作成する
        </Link>
        <Link
          href="/fuhou/ceremonies/new?type=obituary_venue"
          className="rounded-md border-2 border-[#9b2fae] bg-white px-6 py-3 font-medium text-[#9b2fae] hover:bg-[#f3e9f6]"
        >
          ＋ 訃報＋オンライン式場を作成する
        </Link>
      </div>

      {/* 主要導線 */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/fuhou/ceremonies", title: "葬儀一覧", desc: "作成済みの訃報・オンライン式場の確認/編集" },
          { href: "/fuhou/orders", title: "供花・供物 注文一覧", desc: "オンライン注文の確認・ステータス管理" },
          { href: "/fuhou/settings", title: "設定", desc: "供花商品・メール設定など" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg bg-white p-5 shadow-sm hover:shadow-md">
            <p className="font-bold text-[#9b2fae]">{c.title} ›</p>
            <p className="mt-1 text-sm text-gray-500">{c.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
