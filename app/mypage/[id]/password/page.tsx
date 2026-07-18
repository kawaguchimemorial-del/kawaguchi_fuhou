import { notFound, redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { getMournerMemorial } from "@/lib/mourner/data";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";
import { PasswordForm } from "@/components/mourner/PasswordForm";

export default async function PasswordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");
  const m = await getMournerMemorial(id);
  if (!m) notFound();

  return (
    <div>
      <PageHeader title="アカウント情報" backHref={`/mypage/${id}`} />

      <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold">ログインID</h2>
        <p className="font-mono text-lg">{m.loginId ?? "—"}</p>
      </section>

      <PasswordForm memorialId={id} />
      <SiteFooter />
    </div>
  );
}
