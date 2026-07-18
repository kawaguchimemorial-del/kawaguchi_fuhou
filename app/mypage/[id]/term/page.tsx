import { redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

// 利用規約。本文は法務確認のうえ差し込むため、ここでは器のみ用意する。

export default async function TermPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  return (
    <div>
      <PageHeader title="利用規約" backHref={`/mypage/${id}`} />
      <section className="rounded-lg bg-white p-5 text-sm leading-relaxed shadow-sm">
        <p className="text-[#8a8a8a]">
          利用規約は準備中です。内容が確定次第、こちらに掲載いたします。
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
