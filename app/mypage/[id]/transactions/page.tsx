import { redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

// 特定商取引法に基づく表記。記載事項は法定のため、事業者情報確定後に差し込む。

export default async function TransactionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  return (
    <div>
      <PageHeader title="特定商取引法に基づく表記" backHref={`/mypage/${id}`} />
      <section className="rounded-lg bg-white p-5 text-sm leading-relaxed shadow-sm">
        <p className="text-[#8a8a8a]">
          特定商取引法に基づく表記は準備中です。内容が確定次第、こちらに掲載いたします。
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
