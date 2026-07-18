import { redirect } from "next/navigation";
import { getMournerSession } from "@/lib/mourner/auth";
import { SignInForm } from "@/components/mourner/SignInForm";

export default async function MournerSignInPage() {
  // ログイン済みならそのままマイページへ
  const s = await getMournerSession();
  if (s) redirect(`/mypage/${s.memorialId}`);

  return (
    <div className="py-12">
      <h1 className="mb-2 text-center text-2xl font-bold">マイページ ログイン</h1>
      <p className="mb-8 text-center text-sm text-[#6b6b6b]">
        葬儀社よりお伝えしたログインIDとパスワードをご入力ください。
      </p>
      <SignInForm />
    </div>
  );
}
