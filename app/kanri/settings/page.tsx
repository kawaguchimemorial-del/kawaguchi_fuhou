import { getCompanyInfo } from "@/lib/kanri/masters";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { listInvoices } from "@/lib/kanri/invoices";

export const metadata = { title: "葬儀会社" };
export const dynamic = "force-dynamic";

async function counts(): Promise<{ deceased: number; views: number; attendees: number }> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { deceased: 0, views: 0, attendees: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = createAdminClient() as unknown as { from: (t: string) => any };
  const [m, v, g] = await Promise.all([
    c.from("memorials").select("id", { count: "exact", head: true }),
    c.from("memorial_views").select("id", { count: "exact", head: true }),
    c.from("condolence_messages").select("id", { count: "exact", head: true }),
  ]);
  return { deceased: m.count ?? 0, views: v.count ?? 0, attendees: g.count ?? 0 };
}

export default async function CompanyDashboard() {
  const [co, k, invoices] = await Promise.all([getCompanyInfo(), counts(), listInvoices()]);
  const sales = invoices.reduce((a, i) => a + i.paidTotal, 0);
  const today = new Date();
  const asOf = `（${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")} 時点）`;
  const addr = [co.prefecture, co.address_city, co.address_street, co.address_building].filter(Boolean).join("");

  const kpis = [
    { label: "総故人数", value: `${k.deceased}件` },
    { label: "総葬儀ページ閲覧数", value: `${k.views}回` },
    { label: "総参列者数", value: `${k.attendees}人` },
    { label: "総売上", value: `${sales.toLocaleString()}円` },
  ];

  return (
    <div>
      <div className="-m-5 mb-5 border-b bg-white px-5 py-4"><h1 className="text-lg font-bold text-gray-800">葬儀会社</h1></div>

      {/* 詳細情報 */}
      <div className="max-w-2xl rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-4 font-bold text-gray-800">詳細情報</p>
        <dl className="space-y-3 text-sm">
          <Row label="葬儀会社名">{co.company_name || "株式会社川口典礼"}</Row>
          <Row label="ロゴ"><span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f6f4] text-lg font-bold text-[#2c8c6f]">川</span></Row>
          <Row label="電話番号">{co.tel ?? ""}</Row>
          <Row label="FAX番号">{co.fax ?? ""}</Row>
          <Row label="住所">{addr}</Row>
        </dl>
      </div>

      {/* KPI 4カード */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kp) => (
          <div key={kp.label} className="rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700">{kp.label}</p>
              <span className="rounded border border-[#2c8c6f] px-2 py-0.5 text-[11px] text-[#2c8c6f]">月別</span>
            </div>
            <p className="mt-3 text-center text-2xl font-bold">{kp.value}</p>
            <p className="mt-2 text-center text-xs text-gray-400">{asOf}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <dt className="w-28 shrink-0 font-bold text-gray-700">{label}</dt>
      <dd className="text-gray-800">{children}</dd>
    </div>
  );
}
