import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/kanri/data";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

function fmt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function CustomerDetail({ params }: Params) {
  const { id } = await params;
  const c = await getCustomer(id);
  if (!c) notFound();
  const addr = [c.prefectureCode, c.addressCity, c.addressStreet, c.addressBuilding].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{c.lastName} {c.firstName ?? ""} <span className="ml-2 text-sm font-normal text-gray-500">様</span></h1>
        <div className="flex gap-2 text-sm">
          <Link href="/kanri/customers" className="rounded border px-3 py-1.5">一覧へ</Link>
          <Link href="/kanri/billing" className="rounded border border-[#9b2fae] px-3 py-1.5 text-[#9b2fae]">見積を作成</Link>
        </div>
      </div>

      <Section title="基本情報">
        <Row label="顧客番号">{c.customerNo ?? "—"}</Row>
        <Row label="氏名">{c.lastName} {c.firstName ?? ""}</Row>
        <Row label="カナ">{[c.lastNameKana, c.firstNameKana].filter(Boolean).join(" ") || "—"}</Row>
        <Row label="ステータス">{c.status ?? "—"}</Row>
        <Row label="流入経路">{c.inflow ?? "—"}</Row>
        <Row label="顧客担当">{c.staffName ?? "—"}</Row>
        <Row label="性別">{c.gender ?? "—"}</Row>
        <Row label="生年月日">{c.birthDate ?? "—"}</Row>
        <Row label="顧客ランク">{c.rank ?? "—"}</Row>
        <Row label="登録日時">{fmt(c.createdAt)}</Row>
      </Section>

      <Section title="連絡先">
        <Row label="自宅番号">{c.telephoneNumber ?? "—"}</Row>
        <Row label="携帯番号">{c.mobileNumber ?? "—"}</Row>
        <Row label="FAX番号">{c.faxNumber ?? "—"}</Row>
        <Row label="メールアドレス">{c.email ?? "—"}</Row>
        <Row label="住所">{c.postcode ? `〒${c.postcode} ` : ""}{addr || "—"}</Row>
        <Row label="SMS自動配信">{c.availableSmsAutoSent ? "対象" : "対象外"}</Row>
        <Row label="DM / メルマガ">{`DM: ${c.availableDmSend ? "受取" : "不要"} / メルマガ: ${c.availableMailMagazine ? "受取" : "不要"}`}</Row>
      </Section>

      {(c.note || c.reason) && (
        <Section title="備考">
          {c.reason && <Row label="問い合わせ理由"><span className="whitespace-pre-wrap">{c.reason}</span></Row>}
          {c.note && <Row label="その他備考"><span className="whitespace-pre-wrap">{c.note}</span></Row>}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="mb-3 font-bold text-[#9b2fae]">{title}</p>
      <div className="divide-y">{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2">
      <span className="w-32 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
