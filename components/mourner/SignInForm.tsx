"use client";

import { useActionState } from "react";
import { signInAction } from "@/lib/mourner/actions";
import type { ActionState } from "@/lib/mourner/types";

export function SignInForm({ defaultLoginId = "" }: { defaultLoginId?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signInAction, {});

  return (
    <form action={action} className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-sm">
      {state.error && (
        <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label htmlFor="loginId" className="block text-sm text-[#6b6b6b]">
        ログインID
      </label>
      <input
        id="loginId"
        name="loginId"
        type="text"
        required
        defaultValue={defaultLoginId}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        className="mb-5 w-full border-b border-[#ddd] py-2.5 text-lg focus:border-[#1b2a4a] focus:outline-none"
      />

      <label htmlFor="password" className="block text-sm text-[#6b6b6b]">
        パスワード
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        // IDが入力済みなら、そのままパスワードを打ち始められるようにする
        autoFocus={Boolean(defaultLoginId)}
        autoComplete="current-password"
        className="w-full border-b border-[#ddd] py-2.5 text-lg focus:border-[#1b2a4a] focus:outline-none"
      />
      <p className="mt-2 mb-6 text-xs text-[#8a8a8a]">
        ※ ご入力頂いた電話番号下6桁が初期パスワードに自動設定されています。
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-[#1b2a4a] py-3.5 text-base font-medium text-white disabled:opacity-60"
      >
        {pending ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
