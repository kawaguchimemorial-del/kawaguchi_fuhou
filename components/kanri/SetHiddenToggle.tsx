"use client";
import { useState, useTransition } from "react";
import { setProductSetHidden } from "@/lib/kanri/actions";

// セット商品一覧の「非表示」チェック。チェックすると見積もり作成のセット選択に出さない。
export function SetHiddenToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const [on, setOn] = useState(hidden);
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(() => setProductSetHidden(id, next));
        }}
      />
      非表示
    </label>
  );
}
