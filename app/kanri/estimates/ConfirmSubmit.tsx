"use client";
import type { ReactNode } from "react";

// 破壊的/即実行のサーバーアクションを確認ダイアログでガードする最小ラッパ。
// サーバーアクションは action prop 経由でそのまま温存する。
export function ConfirmSubmit({ action, id, confirm, className, children }: {
  action: (fd: FormData) => Promise<void> | void;
  id: string;
  confirm: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}
