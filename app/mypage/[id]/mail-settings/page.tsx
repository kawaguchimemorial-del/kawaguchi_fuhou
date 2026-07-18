import { notFound, redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getMournerMemorial } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { MailSettingsForm } from "@/components/mourner/MailSettingsForm";

export default async function MailSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");
  const m = await getMournerMemorial(id);
  if (!m) notFound();

  return (
    <div>
      <PageHeader title="メール通知設定" backHref={`/mypage/${id}`} />
      <MailSettingsForm
        memorialId={id}
        email={m.notifyEmail}
        receipt={m.notifyReceipt}
        koden={m.notifyKoden}
      />
      <SiteFooter />
    </div>
  );
}
