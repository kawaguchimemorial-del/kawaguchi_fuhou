"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/mourner/actions";
import type { ActionState } from "@/lib/mourner/types";

export function PasswordForm({ memorialId }: { memorialId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="rounded-lg bg-white p-5 shadow-sm">
      <input type="hidden" name="memorialId" value={memorialId} />
      <h2 className="mb-4 font-bold">パスワード変更</h2>

      {state.error && <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}

      <label htmlFor="current" className="block text-sm text-[#6b6b6b]">現在のパスワード</label>
      <input id="current" name="current" type="password" required autoComplete="current-password"
             className="mb-5 w-full border-b border-[#ddd] py-2.5 text-base focus:border-[#1b2a4a] focus:outline-none" />

      <label htmlFor="next" className="block text-sm text-[#6b6b6b]">新しいパスワード（6文字以上）</label>
      <input id="next" name="next" type="password" required minLength={6} autoComplete="new-password"
             className="mb-5 w-full border-b border-[#ddd] py-2.5 text-base focus:border-[#1b2a4a] focus:outline-none" />

      <label htmlFor="confirm" className="block text-sm text-[#6b6b6b]">新しいパスワード（確認）</label>
      <input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password"
             className="mb-6 w-full border-b border-[#ddd] py-2.5 text-base focus:border-[#1b2a4a] focus:outline-none" />

      <button type="submit" disabled={pending}
              className="rounded bg-[#1b2a4a] px-6 py-3 text-sm text-white disabled:opacity-60">
        {pending ? "変更中…" : "パスワードを変更する"}
      </button>
    </form>
  );
}
