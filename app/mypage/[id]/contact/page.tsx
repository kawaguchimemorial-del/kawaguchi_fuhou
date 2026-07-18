import { redirect } from "next/navigation";
import { assertMournerAccess } from "@/lib/mourner/auth";
import { PageHeader, SiteFooter } from "@/components/mourner/Shell";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await assertMournerAccess(id))) redirect("/mypage/sign-in");

  const tel = process.env.NEXT_PUBLIC_CONTACT_TEL ?? "";
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";

  return (
    <div>
      <PageHeader title="お問い合わせ" backHref={`/mypage/${id}`} />
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <p className="mb-5 text-sm leading-relaxed text-[#6b6b6b]">
          マイページの操作方法、オンライン式場の内容変更などは、担当葬儀社までお問い合わせください。
        </p>
        <p className="mb-4 font-bold">株式会社川口典礼</p>
        {tel && (
          <p className="mb-3">
            <span className="mr-2 text-sm text-[#8a8a8a]">お電話</span>
            <a href={`tel:${tel.replace(/[^0-9+]/g, "")}`} className="text-lg text-[#1b2a4a] underline">{tel}</a>
          </p>
        )}
        {email && (
          <p>
            <span className="mr-2 text-sm text-[#8a8a8a]">メール</span>
            <a href={`mailto:${email}`} className="text-[#1b2a4a] underline">{email}</a>
          </p>
        )}
        {!tel && !email && (
          <p className="text-sm text-[#8a8a8a]">
            連絡先が未設定です。環境変数 NEXT_PUBLIC_CONTACT_TEL / NEXT_PUBLIC_CONTACT_EMAIL を設定してください。
          </p>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
