"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ログイン画面。
// ※現在はSupabaseのAuth未接続のため「デモログイン」。入力内容に関わらず管理画面へ進みます。
// TODO(supabase): supabase.auth.signInWithPassword で実認証し、成功時のみ /admin へ。
//   失敗時はエラー表示。middleware で /admin を保護。
export default function SignInPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    // デモ: 認証せず管理画面へ
    router.push("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="text-center">
        <p className="font-serif text-2xl tracking-wide text-[var(--primary)]">川口典礼</p>
        <p className="mt-1 text-xs tracking-[0.3em] text-[var(--accent)]">ONLINE MEMORIAL</p>
      </div>

      <h1 className="mt-10 text-center font-serif text-xl text-[var(--primary)]">ログイン</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm text-[var(--muted)]">メールアドレス</span>
          <input
            type="email"
            autoComplete="username"
            className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[var(--muted)]">パスワード</span>
          <input
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-sm bg-[var(--primary)] py-3.5 text-white disabled:opacity-60"
        >
          {pending ? "ログイン中…" : "ログイン"}
        </button>
      </form>

      <div className="mt-8 rounded-md bg-[var(--card)] px-4 py-4 text-center text-sm">
        <p className="text-[var(--muted)]">
          ※ 現在はデモ版です。認証は未接続のため、どなたでも管理画面をご覧いただけます。
        </p>
        <Link
          href="/admin"
          className="mt-3 inline-block rounded-sm border border-[var(--accent)] px-6 py-2.5 text-[var(--accent)]"
        >
          管理画面（マイページ）を見る →
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        <Link href="/" className="underline">トップへ戻る</Link>
      </p>
    </main>
  );
}
