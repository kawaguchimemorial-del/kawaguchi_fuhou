"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type SignInState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-sm bg-[var(--primary)] py-3.5 text-white disabled:opacity-60"
    >
      {pending ? "ログイン中…" : "ログイン"}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {
    error: null,
    email: "",
  });

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p
          role="alert"
          className="rounded-sm bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <label className="block">
        <span className="text-sm text-[var(--muted)]">メールアドレス</span>
        <input
          type="email"
          name="email"
          // 失敗して再描画されたときに、打ち直させないよう入力値を戻す
          defaultValue={state.email}
          key={state.email}
          required
          autoComplete="username"
          autoFocus={!state.email}
          className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none"
          placeholder="you@example.com"
          // スマホで自動ズームしないよう16px
          style={{ fontSize: 16 }}
        />
      </label>
      <label className="block">
        <span className="text-sm text-[var(--muted)]">パスワード</span>
        <input
          type="password"
          name="password"
          required
          // やり直しのときはパスワードだけ打てばよいようにする
          autoFocus={Boolean(state.email)}
          autoComplete="current-password"
          className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none"
          style={{ fontSize: 16 }}
        />
      </label>

      <SubmitButton />
    </form>
  );
}
