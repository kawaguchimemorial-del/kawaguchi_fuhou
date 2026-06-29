"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitMessage, type ActionResult } from "@/lib/memorial/actions";

export function MessageForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    submitMessage,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-md bg-[var(--card)] px-6 py-10 text-center">
        <p className="font-serif text-lg text-[var(--primary)]">{state.message}</p>
        <Link
          href={`/m/${slug}/venue/hall`}
          className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]"
        >
          式場へ戻る
        </Link>
      </div>
    );
  }

  const err = state?.ok === false ? state.errors : {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      {err._form && (
        <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err._form}</p>
      )}

      <Field label="お名前" name="senderName" error={err.senderName} required>
        <input
          id="senderName"
          name="senderName"
          type="text"
          autoComplete="name"
          className="mt-1 w-full border-b border-[var(--border)] bg-transparent py-2 focus:border-[var(--accent)] focus:outline-none"
        />
      </Field>

      <Field label="メッセージ" name="body" error={err.body} required>
        <textarea
          id="body"
          name="body"
          rows={6}
          maxLength={1000}
          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent p-3 focus:border-[var(--accent)] focus:outline-none"
          placeholder="ご遺族・故人へのお悔やみのお気持ちをお書きください。"
        />
      </Field>

      <p className="text-xs text-[var(--muted)]">
        ※ お預かりしたメッセージは、ご遺族の確認後に式場に公開されます。
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white transition-colors hover:bg-[var(--accent-strong)] disabled:opacity-60"
      >
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  required,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-[var(--muted)]">
        {label}
        {required && <span className="ml-1 text-[var(--danger)]">必須</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
