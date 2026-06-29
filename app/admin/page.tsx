import Link from "next/link";

const CREATE_OPTIONS = [
  { href: "/admin/ceremonies/new?type=obituary", label: "訃報を作成する" },
  { href: "/admin/ceremonies/new?type=obituary_venue", label: "訃報＋オンライン式場を作成する" },
  { href: "/admin/ceremonies/new?type=obituary&test=1", label: "訃報のテストを作成する（無料）" },
  { href: "/admin/ceremonies/new?type=obituary_venue&test=1", label: "訃報＋式場のテストを作成する（無料）" },
];

const USAGE = [
  { month: "2026年4月", count: 2 },
  { month: "2026年5月", count: 0 },
  { month: "2026年6月", count: 1 },
];

const NEWS = [
  { date: "2026年05月18日(月) 15:09", title: "※重要※ 訃報作成＆喪主様連携の簡略化についてのお知らせ" },
  { date: "2026年01月21日(水) 12:03", title: "※重要※ サポート対応時間変更のお知らせ" },
  { date: "2026年01月08日(木) 14:38", title: "※重要※ 利用規約改定のお知らせ" },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-4xl">
      {/* 作成ボタン（ドロップダウン） */}
      <div className="mb-8 flex justify-center">
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md bg-[#9b2fae] px-6 py-3 text-white">
            ＋ 新しい葬儀を作成する
          </summary>
          <div className="absolute left-1/2 z-10 mt-2 w-80 -translate-x-1/2 overflow-hidden rounded-md border bg-white shadow-lg">
            {CREATE_OPTIONS.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="block px-5 py-3 text-sm hover:bg-[#f3e9f6]"
              >
                {o.label}
              </Link>
            ))}
          </div>
        </details>
      </div>

      {/* 利用数 */}
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">オンライン式場ご利用数</h2>
        <div className="grid grid-cols-3 gap-4">
          {USAGE.map((u) => (
            <div key={u.month} className="rounded border p-4 text-center">
              <p className="text-xs text-gray-500">{u.month}ご利用件数</p>
              <p className="mt-1 text-2xl font-bold">{u.count}件</p>
            </div>
          ))}
        </div>
      </section>

      {/* お知らせ */}
      <section className="mt-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">お知らせ</h2>
        <ul className="divide-y">
          {NEWS.map((n) => (
            <li key={n.title} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
              <span className="shrink-0 text-sm text-gray-500">{n.date}</span>
              <span className="text-sm">{n.title}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
