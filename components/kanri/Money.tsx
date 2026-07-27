/**
 * 金額表示。数値と単位を別要素にして、一覧の右端が「円」ではなく数値で揃うようにする。
 * 桁が読めないと請求ミスに直結するため、tabular-nums で桁幅も固定する。
 *
 * - 未設定(null/undefined) は「—」
 * - 0 は「0円」（未設定と区別する）
 * - 負値・未収は danger 色
 */
export function Money({
  value,
  danger,
  className = "",
}: {
  value: number | null | undefined;
  /** 未収・返金など注意を引きたい金額 */
  danger?: boolean;
  className?: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={`k-money ${className}`} style={{ color: "var(--k-ink-faint)" }}>—</span>;
  }
  const isDanger = danger ?? value < 0;
  return (
    <span className={`k-money ${isDanger ? "is-danger" : ""} ${className}`}>
      <span className="num">{value.toLocaleString()}</span>
      <span className="unit">円</span>
    </span>
  );
}
