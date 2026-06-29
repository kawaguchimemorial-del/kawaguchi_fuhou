// 和暦変換。訃報・オンライン式場で没日・式日を「令和○年○月○日」で表示する。

const ERAS = [
  { name: "令和", start: new Date("2019-05-01") },
  { name: "平成", start: new Date("1989-01-08") },
  { name: "昭和", start: new Date("1926-12-25") },
  { name: "大正", start: new Date("1912-07-30") },
  { name: "明治", start: new Date("1868-01-25") },
];
const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-07-01" / ISO → "令和8年7月1日(水)"。withWeekday=falseで曜日省略 */
export function toWareki(input?: string | Date, withWeekday = true): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  const era = ERAS.find((e) => d >= e.start);
  if (!era) return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const eraYear = d.getFullYear() - era.start.getFullYear() + 1;
  const y = eraYear === 1 ? "元" : String(eraYear);
  const base = `${era.name}${y}年${d.getMonth() + 1}月${d.getDate()}日`;
  return withWeekday ? `${base}(${WD[d.getDay()]})` : base;
}

/** 没日表記用：「令和8年6月28日」（曜日なし） */
export function toWarekiDate(input?: string | Date): string {
  return toWareki(input, false);
}
