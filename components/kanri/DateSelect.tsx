"use client";
import { useEffect, useState } from "react";

// タブレットで扱いやすい「年・月・日」プルダウン式の日付入力。
// ネイティブの type="date" は年を1年ずつしか送れず高齢者の生年入力が大変なため、こちらを使う。
// value/onChange は "YYYY-MM-DD"（未完成時は ""）。name を渡すとフォーム送信用のhidden inputも出力する。

const ERAS = [
  { name: "令和", startY: 2019, startM: 5 },
  { name: "平成", startY: 1989, startM: 1 },
  { name: "昭和", startY: 1926, startM: 12 },
  { name: "大正", startY: 1912, startM: 7 },
  { name: "明治", startY: 1868, startM: 1 },
];
// その年の年央(7月)を基準に和暦を推定してラベル用の元号名を返す（例：昭和25）
function eraLabel(y: number): string {
  for (const e of ERAS) {
    if (y > e.startY || (y === e.startY && 7 >= e.startM)) {
      const n = y - e.startY + 1;
      return `${e.name}${n === 1 ? "元" : n}`;
    }
  }
  return "";
}

function parse(v: string): [string, string, string] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
  if (!m) return ["", "", ""];
  return [m[1], String(Number(m[2])), String(Number(m[3]))];
}
const pad = (n: string) => n.padStart(2, "0");
const daysInMonth = (y: string, m: string) => (y && m ? new Date(Number(y), Number(m), 0).getDate() : 31);

export function DateSelect({
  name,
  value,
  onChange,
  fromYear,
  toYear,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  fromYear?: number;
  toYear?: number;
}) {
  const curY = new Date().getFullYear();
  const maxY = toYear ?? curY;
  const minY = fromYear ?? curY - 120;
  const [[y, m, d], setParts] = useState<[string, string, string]>(() => parse(value));

  // 施行番号読込やプリフィルなど、外部から非空の値が入った場合に同期（空での初期化ミスは無視）
  useEffect(() => {
    const cur = y && m && d ? `${y}-${pad(m)}-${pad(d)}` : "";
    if (value && value !== cur) setParts(parse(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function update(ny: string, nm: string, nd: string) {
    // 日が月末を超えたら丸める
    const dim = daysInMonth(ny, nm);
    if (nd && Number(nd) > dim) nd = String(dim);
    setParts([ny, nm, nd]);
    onChange(ny && nm && nd ? `${ny}-${pad(nm)}-${pad(nd)}` : "");
  }

  const years: number[] = [];
  for (let i = maxY; i >= minY; i--) years.push(i);
  const dim = daysInMonth(y, m);
  const sel = "rounded border border-gray-300 px-2 py-2 text-sm focus:border-[#2c8c6f] focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-1">
      <select value={y} onChange={(e) => update(e.target.value, m, d)} className={sel} aria-label="年">
        <option value="">年</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>
            {yy}{eraLabel(yy) ? `（${eraLabel(yy)}）` : ""}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-400">年</span>
      <select value={m} onChange={(e) => update(y, e.target.value, d)} className={sel} aria-label="月">
        <option value="">月</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
          <option key={mm} value={mm}>{mm}</option>
        ))}
      </select>
      <span className="text-xs text-gray-400">月</span>
      <select value={d} onChange={(e) => update(y, m, e.target.value)} className={sel} aria-label="日">
        <option value="">日</option>
        {Array.from({ length: dim }, (_, i) => i + 1).map((dd) => (
          <option key={dd} value={dd}>{dd}</option>
        ))}
      </select>
      <span className="text-xs text-gray-400">日</span>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
