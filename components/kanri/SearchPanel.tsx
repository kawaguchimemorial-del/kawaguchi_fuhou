import Link from "next/link";

/**
 * 一覧画面の検索パネル。
 * 既定は閉じた状態で、URLに検索条件が1つでも付いていれば自動的に開く。
 * 入力項目の name・GETパラメータ・並びは一切変えない（絞り込み結果が変わらないため）。
 *
 * - keyword: 折りたたみの外に常時出す1本（無ければ省略可）
 * - children: 折りたたみの中に入る詳細条件
 * - chips: 適用中の条件。×でその条件だけ外したURLへ飛ぶ
 */
export type Chip = { label: string; href: string };

export function SearchPanel({
  basePath,
  params,
  keyword,
  children,
  chips,
}: {
  /** 条件をすべて外すときの遷移先 */
  basePath: string;
  /** 現在のクエリ（空でないものが1つでもあれば自動展開） */
  params: Record<string, string | string[] | undefined>;
  keyword?: React.ReactNode;
  children: React.ReactNode;
  chips?: Chip[];
}) {
  const hasCondition = Object.values(params).some((v) =>
    Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== ""
  );

  return (
    <form className="mb-4 rounded-lg bg-white p-4 text-sm">
      {keyword && <div className="mb-3">{keyword}</div>}

      <details open={hasCondition} className="k-search-details">
        <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-sm" style={{ color: "var(--k-action)" }}>
          詳細条件
        </summary>
        <div className="mt-3">{children}</div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="inline-flex min-h-[36px] items-center rounded-[4px] px-6 text-white" style={{ background: "var(--k-brand-bg)" }}>
          検索
        </button>
        {hasCondition && (
          <Link href={basePath} className="text-xs underline" style={{ color: "var(--k-ink-soft)" }}>
            条件をすべて解除
          </Link>
        )}
      </div>

      {chips && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <Link
              key={c.label + c.href}
              href={c.href}
              className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs"
              style={{ background: "var(--k-brand-tint)", color: "var(--k-brand-bg)" }}
            >
              {c.label}
              <span aria-hidden>×</span>
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}

/** 適用中条件チップの生成。key を1つだけ外したURLを作る。 */
export function buildChips(
  basePath: string,
  params: Record<string, string | string[] | undefined>,
  labels: Record<string, string>
): Chip[] {
  const chips: Chip[] = [];
  for (const [k, v] of Object.entries(params)) {
    const values = Array.isArray(v) ? v : typeof v === "string" && v.trim() !== "" ? [v] : [];
    if (values.length === 0) continue;
    const rest = new URLSearchParams();
    for (const [k2, v2] of Object.entries(params)) {
      if (k2 === k) continue;
      const vs = Array.isArray(v2) ? v2 : typeof v2 === "string" && v2.trim() !== "" ? [v2] : [];
      for (const x of vs) rest.append(k2, x);
    }
    const qs = rest.toString();
    chips.push({
      label: `${labels[k] ?? k}: ${values.join(" / ")}`,
      href: qs ? `${basePath}?${qs}` : basePath,
    });
  }
  return chips;
}
