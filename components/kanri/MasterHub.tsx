"use client";

import Link from "next/link";
import { useState } from "react";

export type MasterItem = {
  href: string;
  label: string;
  /** 件数（マスタのみ） */
  count?: number;
  hint?: string;
  category: string;
};

/**
 * 設定マスタのハブ。項目数が多く目視で探しづらいので、名称の部分一致で絞り込めるようにする。
 * リンク先・並び順・グループは一切変えない（絞り込みは表示のフィルタのみ）。
 */
export function MasterHub({ items, categories }: { items: MasterItem[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const k = q.trim();
  const shown = k ? items.filter((m) => m.label.includes(k) || (m.hint ?? "").includes(k)) : items;
  const groups = categories.filter((c) => shown.some((m) => m.category === c));

  return (
    <div className="space-y-6">
      <div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="設定項目を名前で絞り込む"
          className="w-full max-w-md rounded-[4px] border px-3"
          style={{ height: 44, fontSize: 16, borderColor: "var(--k-line)" }}
        />
        {k && (
          <p className="mt-1 text-xs" style={{ color: "var(--k-ink-soft)" }}>
            {shown.length}件が一致（{items.length}件中）
            <button type="button" onClick={() => setQ("")} className="ml-2 underline">
              解除
            </button>
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--k-ink-faint)" }}>
          該当する設定項目がありません。
        </p>
      ) : (
        groups.map((cat) => (
          <div key={cat}>
            <h2 className="mb-2 pl-2 text-sm font-bold" style={{ borderLeft: "4px solid var(--k-brand-bg)", color: "var(--k-ink)" }}>
              {cat}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown
                .filter((m) => m.category === cat)
                .map((m) => (
                  <Link key={m.href} href={m.href} className="rounded-lg bg-white p-3">
                    <p className="text-sm font-medium" style={{ color: "var(--k-brand-text)" }}>{m.label}</p>
                    {typeof m.count === "number" && (
                      <p className="mt-1 text-xs" style={{ color: "var(--k-ink-faint)" }}>{m.count} 件</p>
                    )}
                    {m.hint && (
                      <p className="mt-1 text-[11px] leading-snug line-clamp-2" style={{ color: "var(--k-ink-faint)" }}>{m.hint}</p>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
