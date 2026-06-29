// 日本語の日時整形。曜日・午前午後を明示（高齢者・スクリーンリーダー配慮）。

const WD = ["日", "月", "火", "水", "木", "金", "土"];

export function formatJpDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
}

export function formatJpTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "午前" : "午後";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm}${h12}時${m === 0 ? "" : m + "分"}`;
}

export function formatJpDateTime(iso?: string): string {
  if (!iso) return "";
  return `${formatJpDate(iso)} ${formatJpTime(iso)}`;
}

/** 受付終了などの締切が過ぎているか */
export function isPast(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}
