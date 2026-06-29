"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitRsvp, type ActionResult } from "@/lib/memorial/actions";

export function RsvpForm({ slug, events }: { slug: string; events: string[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    submitRsvp,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-md bg-[var(--card)] px-6 py-10 text-center">
        <p className="font-serif text-lg text-[var(--primary)]">{state.message}</p>
        <Link href={`/m/${slug}`} className="mt-8 inline-block rounded-sm border border-[var(--accent)] px-6 py-3 text-[var(--accent)]">
          訃報ページへ戻る
        </Link>
      </div>
    );
  }
  const err = state?.ok === false ? state.errors : {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <Field label="お名前" name="attendeeName" error={err.attendeeName} required>
        <input id="attendeeName" name="attendeeName" autoComplete="name" className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none" />
      </Field>
      <Field label="フリガナ（任意）" name="kana">
        <input id="kana" name="kana" className="mt-1 w-full border-b py-2 focus:border-[var(--accent)] focus:outline-none" />
      </Field>

      <div>
        <p className="text-sm text-[var(--muted)]">参列方法</p>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="radio" name="mode" value="real" defaultChecked className="accent-[var(--accent)]" /> 会場で参列する
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="mode" value="online" className="accent-[var(--accent)]" /> オンラインで参列する
        </label>
      </div>

      {events.length > 0 && (
        <Field label="参列する式" name="event">
          <select id="event" name="event" className="mt-1 w-full rounded border px-3 py-2">
            {events.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="参列人数" name="headcount" error={err.headcount} required>
        <input id="headcount" name="headcount" type="number" min={1} max={20} defaultValue={1} className="mt-1 w-24 rounded border px-3 py-2 text-right" />
      </Field>

      {err._form && <p className="rounded bg-red-50 px-4 py-2 text-sm text-[var(--danger)]">{err._form}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-sm bg-[var(--accent)] py-3.5 text-white hover:bg-[var(--accent-strong)] disabled:opacity-60">
        {pending ? "送信中…" : "出欠を登録する"}
      </button>
    </form>
  );
}

function Field({ label, name, error, required, children }: { label: string; name: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm text-[var(--muted)]">
        {label}{required && <span className="ml-1 text-[var(--danger)]">必須</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
