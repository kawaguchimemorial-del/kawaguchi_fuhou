import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin/auth";
import { SignInForm } from "./SignInForm";

export const metadata = {
  title: "ログイン｜川口典礼",
  robots: { index: false, follow: false },
};

// ログイン画面。Supabase Auth で実認証する（メールアドレス＋パスワード）。
// アカウントの発行・停止は scripts/manage-admin-user.mjs で行う（自己登録は無し）。
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // ログイン済みの人がこの画面に来たら管理画面へ送る（再入力させない）。
  const already = await getAdminUser();
  if (already) redirect(next && next.startsWith("/") ? next : "/kanri");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="text-center">
        <p className="font-serif text-2xl tracking-wide text-[var(--primary)]">川口典礼</p>
        <p className="mt-1 text-xs tracking-[0.3em] text-[var(--accent)]">ONLINE MEMORIAL</p>
      </div>

      <h1 className="mt-10 text-center font-serif text-xl text-[var(--primary)]">ログイン</h1>

      <SignInForm next={next ?? ""} />

      <p className="mt-8 text-center text-xs leading-relaxed text-[var(--muted)]">
        パスワードが分からない場合は管理者にお問い合わせください。
        <br />
        <Link href="/" className="underline">トップへ戻る</Link>
      </p>
    </main>
  );
}
