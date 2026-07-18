"use client";

import { useActionState, useState } from "react";
import { saveGreetingAction } from "@/lib/mourner/actions";
import type { ActionState } from "@/lib/mourner/types";

export function GreetingEditor({ memorialId, initial }: { memorialId: string; initial: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveGreetingAction, {});

  // 保存が成功したら表示モードへ戻す
  if (state.ok && editing) setEditing(false);

  return (
    <section className="mb-4 rounded-lg bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-bold">喪主挨拶</h2>

      {state.ok && !editing && (
        <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>
      )}

      {!editing ? (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{initial}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded border border-[#ccc] px-4 py-2.5 text-sm"
          >
            喪主挨拶を変更する
          </button>
        </>
      ) : (
        <form action={action}>
          <input type="hidden" name="memorialId" value={memorialId} />
          {state.error && (
            <p role="alert" className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <textarea
            name="greeting"
            defaultValue={initial}
            rows={10}
            maxLength={2000}
            className="w-full rounded border border-[#ddd] p-3 text-sm leading-relaxed focus:border-[#1b2a4a] focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setEditing(false)}
                    className="rounded border border-[#ccc] px-4 py-2.5 text-sm">
              キャンセル
            </button>
            <button type="submit" disabled={pending}
                    className="rounded bg-[#1b2a4a] px-6 py-2.5 text-sm text-white disabled:opacity-60">
              {pending ? "保存中…" : "保存する"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
