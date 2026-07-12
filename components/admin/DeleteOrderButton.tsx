"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/lib/admin/product-actions";

// 注文一覧の削除ボタン。行クリック(遷移)を止めて注文を削除する。
export function DeleteOrderButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        if (!confirm("この注文を削除します。よろしいですか？")) return;
        start(async () => {
          const res = await deleteOrder(id);
          if (res.ok) router.refresh();
          else alert(`削除に失敗しました：${res.error ?? ""}`);
        });
      }}
      className="rounded border border-red-400 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "削除中…" : "削除"}
    </button>
  );
}
