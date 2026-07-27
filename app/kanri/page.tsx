import Link from "next/link";
import { UserPlus, Users, FileText, Receipt, CircleDollarSign, ClipboardList, AlertTriangle, CalendarClock, ChevronRight } from "lucide-react";
import { listCustomers, countCustomers } from "@/lib/kanri/data";
import { listEstimates, deceasedFullName } from "@/lib/kanri/estimates";
import { listInvoices } from "@/lib/kanri/invoices";
import { Calendar } from "@/components/kanri/Calendar";
import { PageHeader } from "@/components/kanri/PageHeader";

export const dynamic = "force-dynamic";

// クイックアクション(機能削減ゼロ: 旧タイルを全維持)
const GROUPS = [
  { title: "顧客登録", items: [
    { label: "新規登録", href: "/kanri/customers/new", icon: UserPlus },
    { label: "顧客情報確認", href: "/kanri/customers", icon: Users },
  ] },
  { title: "葬儀発生", items: [
    { label: "顧客呼び出し", href: "/kanri/customers", icon: Users },
    { label: "葬儀見積作成", href: "/kanri/estimates/intake", icon: FileText },
    { label: "見積もり一覧", href: "/kanri/estimates", icon: ClipboardList },
    { label: "請求書作成", href: "/kanri/billing", icon: Receipt },
  ] },
  { title: "事前相談", items: [
    { label: "顧客呼び出し", href: "/kanri/customers", icon: Users },
    { label: "事前見積作成", href: "/kanri/estimates/intake", icon: FileText },
  ] },
  { title: "その他", items: [
    { label: "入金管理", href: "/kanri/deposits", icon: CircleDollarSign },
    { label: "ユーザー管理", href: "/kanri/settings", icon: Users },
  ] },
];

function jstYmd(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
}
function jstTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(d);
}
function fmt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} (${w}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function KanriDashboard() {
  // 月別顧客登録数のグラフは廃止（顧客のcreated_atが一括取込で取込月に寄り、実態と異なる数字を描くため）
  const [recent, total, estimates, invoices] = await Promise.all([
    listCustomers(), countCustomers(), listEstimates(), listInvoices(),
  ]);

  // カレンダー用イベント
  const events = estimates.flatMap((e) => {
    const evs: { date: string; label: string; type: string }[] = [];
    if (e.wakeAt) evs.push({ date: e.wakeAt, label: `通夜 ${deceasedFullName(e)}`, type: "通夜" });
    if (e.funeralAt) evs.push({ date: e.funeralAt, label: `葬儀 ${deceasedFullName(e)}`, type: "葬儀" });
    return evs;
  });

  // 今日の予定(今日+明日、時刻昇順)
  const today = jstYmd(new Date());
  const tomorrow = jstYmd(new Date(Date.now() + 86400000));
  const upcoming = estimates
    .flatMap((e) => {
      const rows: { at: string; kind: "通夜" | "葬儀"; name: string; venue?: string; href: string }[] = [];
      if (e.wakeAt) rows.push({ at: e.wakeAt, kind: "通夜", name: deceasedFullName(e), venue: e.venueName, href: `/kanri/estimates/${e.id}` });
      if (e.funeralAt) rows.push({ at: e.funeralAt, kind: "葬儀", name: deceasedFullName(e), venue: e.venueName, href: `/kanri/estimates/${e.id}` });
      return rows;
    })
    .filter((r) => { const d = jstYmd(new Date(r.at)); return d === today || d === tomorrow; })
    .sort((a, b) => a.at.localeCompare(b.at));

  // 要対応: 未入金(期限超過/本日)
  const attention = invoices
    .filter((iv) => iv.paidTotal < iv.total && iv.dueOn)
    .map((iv) => ({ ...iv, due: jstYmd(new Date(iv.dueOn!)) }))
    .filter((iv) => iv.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 8);

  // KPI
  const monthKey = today.slice(0, 7);
  const funeralsThisMonth = estimates.filter((e) => e.funeralAt && jstYmd(new Date(e.funeralAt)).startsWith(monthKey)).length;
  // 「今月の新規顧客」: 顧客のcreated_atは一括取込で全件が取込月に寄るため実態を表さない。
  // 実際の稼働(請求)を基準に、今月請求(billed_on)のあった顧客の実数で判断する。
  const customersThisMonth = new Set(
    invoices
      .filter((iv) => iv.billedOn && jstYmd(new Date(iv.billedOn)).startsWith(monthKey))
      .map((iv) => iv.customerId ?? `inv:${iv.id}`)
  ).size;
  const outstanding = invoices.reduce((a, iv) => a + Math.max(0, iv.total - iv.paidTotal), 0);

  const todayLabel = (() => {
    const d = new Date();
    const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日(${w})`;
  })();
  const wakeToday = upcoming.filter((u) => u.kind === "通夜" && jstYmd(new Date(u.at)) === today).length;
  const funeralToday = upcoming.filter((u) => u.kind !== "通夜" && jstYmd(new Date(u.at)) === today).length;

  return (
    <div className="space-y-6">
      <PageHeader title="ホーム" />

      {/* 0. 当日帯 — 今日の状況と受付導線を最上部に固定 */}
      <section className="flex flex-wrap items-center gap-4 rounded-lg bg-white px-5 py-4">
        <span className="text-2xl font-bold" style={{ color: "var(--k-ink)" }}>{todayLabel}</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/kanri/schedule" className="hover:underline">今日の通夜 <b className="tabular-nums">{wakeToday}</b> 件</Link>
          <Link href="/kanri/schedule" className="hover:underline">葬儀 <b className="tabular-nums">{funeralToday}</b> 件</Link>
          <Link href="/kanri/receivables" className="hover:underline" style={{ color: attention.length ? "var(--k-danger)" : undefined }}>
            未入金超過 <b className="tabular-nums">{attention.length}</b> 件
          </Link>
        </div>
        <Link
          href="/kanri/customers/new"
          className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-[4px] px-4 text-sm text-white"
          style={{ background: "var(--k-brand-bg)" }}
        >
          <UserPlus size={15} />新規受付
        </Link>
      </section>

      {/* 1. 今日の予定 */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={18} className="text-[#2c8c6f]" />
          <h2 className="text-sm font-bold text-gray-700">今日・明日の予定</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">今日・明日の通夜/葬儀の予定はありません。</p>
        ) : (
          <ul className="divide-y">
            {upcoming.map((u, i) => (
              <li key={i}>
                <Link href={u.href} className="flex min-h-[48px] items-center gap-3 py-2">
                  <span className="w-24 shrink-0 text-sm tabular-nums text-gray-600">{jstYmd(new Date(u.at)) === today ? "今日" : "明日"} {jstTime(u.at)}</span>
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${u.kind === "通夜" ? "bg-[#f0faf8] text-[#2c8c6f]" : "bg-[#e6f6f4] text-[#2c8c6f]"}`}>{u.kind}</span>
                  <span className="font-medium">{u.name}</span>
                  {u.venue && <span className="truncate text-xs text-gray-500">{u.venue}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. 要対応(未入金 期限超過/本日) — 0件時は非表示 */}
      {attention.length > 0 && (
        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#f2683f]" />
            <h2 className="text-sm font-bold text-gray-700">要対応（未入金）</h2>
          </div>
          <ul className="divide-y">
            {attention.map((iv) => (
              <li key={iv.id}>
                <Link href={`/kanri/billing/${iv.id}`} className="flex min-h-[48px] flex-wrap items-center gap-3 py-2">
                  <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${iv.due < today ? "bg-[#fff4f0] text-[#f2683f]" : "bg-amber-50 text-amber-700"}`}>
                    <AlertTriangle size={12} />{iv.due < today ? "期限超過" : "本日期限"}
                  </span>
                  <span className="font-medium">{iv.customerName ?? iv.mournerName ?? iv.invoiceTargetName ?? "—"}</span>
                  <span className="text-xs text-gray-500">{iv.title ?? ""}</span>
                  <span className="ml-auto text-sm font-bold tabular-nums">{(iv.total - iv.paidTotal).toLocaleString()}円</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3. KPI行 — 数字は上に置く。数値と単位を分けて桁を揃える */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "今月の葬儀件数", value: funeralsThisMonth, unit: "件", href: "/kanri/estimates", danger: false },
          { label: "今月の請求顧客数", value: customersThisMonth, unit: "件", href: "/kanri/billing", danger: false },
          { label: "未回収残高", value: outstanding, unit: "円", href: "/kanri/receivables", danger: outstanding > 0 },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="rounded-lg bg-white p-4">
            <p className="text-xs" style={{ color: "var(--k-ink-soft)" }}>{k.label}</p>
            <p className="mt-1">
              <span className="text-[26px] font-bold tabular-nums" style={{ color: k.danger ? "var(--k-danger)" : "var(--k-ink)" }}>
                {k.value.toLocaleString()}
              </span>
              <span className="ml-1 text-xs" style={{ color: "var(--k-ink-faint)" }}>{k.unit}</span>
            </p>
          </Link>
        ))}
      </section>

      {/* 4. クイックアクション(リンクは1つも削らない。正方タイル→横長リスト) */}
      <section className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-lg bg-white p-4">
            <p className="mb-3 text-xs font-bold" style={{ color: "var(--k-ink-soft)", letterSpacing: ".06em" }}>{g.title}</p>
            <div className="space-y-2">
              {g.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.label}
                    href={it.href}
                    className="flex min-h-[48px] items-center gap-2.5 rounded-[4px] border px-3"
                    style={{ borderColor: "var(--k-line)" }}
                  >
                    <Icon size={18} style={{ color: "var(--k-ink-soft)" }} />
                    <span className="flex-1 text-sm" style={{ color: "var(--k-ink)" }}>{it.label}</span>
                    <ChevronRight size={14} style={{ color: "var(--k-ink-faint)" }} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* 5. スケジュール — 右カラム固定をやめて幅いっぱいに */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: "var(--k-ink-soft)" }}>スケジュール</h2>
          <span className="text-xs" style={{ color: "var(--k-ink-faint)" }}>顧客総数 {total.toLocaleString()} 件</span>
        </div>
        <Calendar events={events} />
      </section>

      {/* 6. 新規登録顧客 */}
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">新規登録顧客</p>
          <Link href="/kanri/customers" className="rounded bg-[#4f7cff] px-3 py-1 text-xs text-white">すべてを表示</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs text-gray-500">
              <tr>{["登録日時", "ステータス", "氏名", "メールアドレス"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {recent.length === 0 ? (
                <tr><td colSpan={4} className="px-2 py-8 text-center text-gray-400">顧客が登録されていません。</td></tr>
              ) : (
                recent.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">{fmt(c.createdAt)}</td>
                    <td className="px-2 py-2">{c.status ?? "—"}</td>
                    <td className="px-2 py-2"><Link href={`/kanri/customers/${c.id}`} className="text-[#1aa39a] underline">{c.lastName} {c.firstName ?? ""}</Link></td>
                    <td className="px-2 py-2 text-gray-500">{c.email ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
