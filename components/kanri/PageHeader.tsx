import Link from "next/link";

/**
 * 葬儀管理ソフト 各画面の見出し。
 * 白地＋左のブランド縦罫＋下辺1px罫線の帳票調。ベタ塗りの色帯は使わない。
 * actions は配列で複数置ける。従来の action={{label,href}} もそのまま動く。
 */
export type PageAction = {
  label: string;
  href: string;
  variant?: "primary" | "ghost";
  /** 外部リンク/ダウンロード。next/link ではなく素の <a> で出す */
  external?: boolean;
};

export function PageHeader({
  title,
  action,
  actions,
  count,
}: {
  title: string;
  action?: { label: string; href: string };
  actions?: PageAction[];
  /** 見出し右の件数ピル */
  count?: number;
}) {
  const list: PageAction[] = actions ?? (action ? [{ ...action, variant: "primary" as const }] : []);
  return (
    <div
      className="-mx-5 -mt-5 mb-4 bg-white px-5 pb-3 pt-3"
      style={{ borderBottom: "1px solid var(--k-line, #e0ddd6)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-block h-5 w-[3px] rounded-[2px]"
            style={{ background: "var(--k-brand-bg, #1f6b54)" }}
          />
          <h1 className="text-xl font-bold" style={{ color: "var(--k-ink, #1f2421)" }}>
            {title}
          </h1>
          {typeof count === "number" && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{ background: "var(--k-brand-tint, #eef4f1)", color: "var(--k-brand-bg, #1f6b54)" }}
            >
              {count.toLocaleString()}件
            </span>
          )}
        </div>
        {list.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {list.map((a) => (
              <ActionButton key={a.href + a.label} {...a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ label, href, variant = "primary", external }: PageAction) {
  const cls = "inline-flex min-h-[36px] items-center rounded-[4px] px-4 text-sm";
  const style =
    variant === "primary"
      ? { background: "var(--k-brand-bg, #1f6b54)", color: "#fff" }
      : { border: "1px solid var(--k-line, #e0ddd6)", color: "var(--k-action, #35597a)", background: "#fff" };
  if (external) {
    return (
      <a href={href} className={cls} style={style}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} style={style}>
      {label}
    </Link>
  );
}
