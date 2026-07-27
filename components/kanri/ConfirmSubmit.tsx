"use client";
import type { ReactNode } from "react";

// 破壊的/即実行のサーバーアクションを確認ダイアログでガードする最小ラッパ。
// サーバーアクションは action prop 経由でそのまま温存する。
export function ConfirmSubmit({ action, id, confirm, className, children, extra }: {
  action: (fd: FormData) => Promise<void> | void;
  id: string;
  confirm: string;
  className?: string;
  children: ReactNode;
  /** id 以外に送る hidden 値 */
  extra?: Record<string, string>;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={className}>{children}</button>
    </form>
  );
}
