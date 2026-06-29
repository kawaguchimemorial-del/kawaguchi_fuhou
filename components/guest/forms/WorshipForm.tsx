"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitWorship, type ActionResult } from "@/lib/memorial/actions";

export function WorshipForm({
  slug,
  worshipLabel,
}: {
  slug: string;
  worshipLabel: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    submitWorship,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-md bg-[var(--card)] px-6 py-10 text-center">
        <p className="font-serif text-lg text-[var(--primary)]">{state.message}</p>
        <p className="mt-3 text-sm text-[var(--muted)]">心ばかりのご厚情、故人もお喜びのことと存じます。</p>
        <Link
          href={`/m/${slug}/venue/hall`}
          className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]"
        >
          式場へ戻る
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      {state?.ok === false && state.errors._form && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{state.errors._form}</p>
      )}

      <div>
        <label htmlFor="displayName" className="block text-sm text-[var(--muted)]">
          お名前（任意）
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          className="mt-1 w-full border-b border-[var(--border)] bg-transparent py-2 focus:border-[var(--accent)] focus:outline-none"
          placeholder="例：山田 一郎"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isAnonymous" value="on" className="h-4 w-4 accent-[var(--accent)]" />
        名前を伏せて{worshipLabel}する（匿名）
      </label>

      <div>
        <label htmlFor="message" className="block text-sm text-[var(--muted)]">
          ひとこと（任意・200文字まで）
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={200}
          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "送信中…" : `${worshipLabel}をする`}
      </button>
    </form>
  );
}
