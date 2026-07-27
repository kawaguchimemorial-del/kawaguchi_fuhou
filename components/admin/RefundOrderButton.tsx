"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refundOfferingOrder } from "@/lib/admin/refund-actions";

/**
 * 供花・供物のカード決済を返金するボタン。
 * 誤操作・権限外の実行を防ぐため、確定前に管理者ID＋パスワードの再入力を求める。
 */
export function RefundOrderButton({ id, amount }: { id: string; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await refundOfferingOrder(id, password);
      if (res.ok) {
        setOpen(false);
        setPassword("");
        alert(`返金しました（${res.amount.toLocaleString()}円）。カード会社の処理により、お客様の口座への反映には5〜10営業日ほどかかります。`);
        router.refresh();
      } else {
        setErr(res.error);
        setPassword("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setErr(null); }}
        className="rounded border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      >
        この決済を返金する
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="返金の確認"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-red-600">カード決済の返金</h2>
            <p className="mt-3 rounded bg-red-50 px-4 py-3 text-sm text-red-800">
              <b>{amount.toLocaleString()}円</b> を注文者のカードへ全額返金します。
              <br />
              この操作は取り消せません。返金後、同じ決済を再度課金することはできません。
            </p>
            <p className="mt-3 text-sm text-gray-600">
              実行するには返金用パスワードを入力してください。
            </p>

            <label className="mt-4 block text-sm text-gray-600">
              返金用パスワード
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded border px-3 py-2"
              />
            </label>

            {err && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setErr(null); setPassword(""); }}
                disabled={pending}
                className="rounded border px-4 py-2 text-sm"
              >
                やめる
              </button>
              <button
                type="submit"
                disabled={pending || !password}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {pending ? "返金中…" : "返金を実行する"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
