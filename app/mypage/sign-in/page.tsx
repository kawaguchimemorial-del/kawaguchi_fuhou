import { redirect } from "next/navigation";
import { getMournerSession } from "@/lib/mourner/auth";
import { SignInForm } from "@/components/mourner/SignInForm";

export default async function MournerSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  // ログイン済みならそのままマイページへ
  const s = await getMournerSession();
  if (s) redirect(`/mypage/${s.memorialId}`);

  // 葬儀社が案内したURL(?id=xxxx)からログインIDを事前入力する。
  // 高齢の喪主が10桁の英数字を手入力する負担を減らすため。IDだけでは入れないので伏せない。
  const { id } = await searchParams;
  const loginId = (id ?? "").trim().toLowerCase().split("@")[0].slice(0, 32);

  return (
    <div className="py-12">
      <h1 className="mb-2 text-center text-2xl font-bold">マイページ ログイン</h1>
      <p className="mb-8 text-center text-sm text-[#6b6b6b]">
        葬儀社よりお伝えしたログインIDとパスワードをご入力ください。
      </p>
      <SignInForm defaultLoginId={loginId} />
    </div>
  );
}
