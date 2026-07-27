import { LegalLayout, DefRow } from "@/components/guest/LegalLayout";
import { COMPANY } from "@/lib/legal/company";

export const metadata = { title: "運営会社" };

export default function CompanyPage() {
  return (
    <LegalLayout title="運営会社">
      <dl className="border-t border-[var(--border)]">
        <DefRow label="会社名">{COMPANY.name}</DefRow>
        <DefRow label="代表者">{COMPANY.representative}</DefRow>
        <DefRow label="所在地">{COMPANY.address}</DefRow>
        <DefRow label="電話番号">
          {COMPANY.phone}（{COMPANY.phoneHours}）
        </DefRow>
        <DefRow label="メールアドレス">{COMPANY.email}</DefRow>
        <DefRow label="事業内容">{COMPANY.business}</DefRow>
      </dl>
      <p className="text-[var(--muted)]">
        ご葬儀に関するご相談、供花・供物のご注文についてのお問い合わせは、
        上記のお電話またはメールにて承っております。
      </p>
    </LegalLayout>
  );
}
