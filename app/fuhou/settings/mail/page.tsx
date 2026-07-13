import Link from "next/link";
import { getAppSetting, getCompanyInfo } from "@/lib/kanri/masters";
import { ORDER_MAIL_DEFAULTS, ORDER_NOTIFY_DEFAULT_TO } from "@/lib/memorial/mail-template";
import { MailSettingsForm } from "@/components/admin/MailSettingsForm";

export const dynamic = "force-dynamic";

export default async function MailSettings() {
  const [notify, tmpl, co] = await Promise.all([
    getAppSetting("order_notify"),
    getAppSetting("order_mail_template"),
    getCompanyInfo(),
  ]);
  const notifyTo = (notify.to ?? "").trim() || process.env.ORDER_NOTIFY_TO || ORDER_NOTIFY_DEFAULT_TO;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/fuhou/settings" className="mb-4 inline-block text-sm text-[#9b2fae] underline">← 設定へ戻る</Link>
      <h1 className="mb-6 text-xl font-bold">メール設定</h1>
      <MailSettingsForm
        notifyTo={notifyTo}
        defaults={ORDER_MAIL_DEFAULTS}
        saved={tmpl}
        sample={{ company: co.company_name || "株式会社 川口典礼", tel: co.tel || "" }}
      />
    </div>
  );
}
