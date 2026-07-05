"use client";
import { useState } from "react";

type Ev = { date: string; label: string; type: string };

export function Calendar({ events }: { events: Ev[] }) {
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() }); // m: 0-11
  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const evByDay: Record<number, Ev[]> = {};
  for (const e of events) {
    const d = new Date(e.date);
    if (d.getFullYear() === ym.y && d.getMonth() === ym.m) {
      const day = d.getDate();
      (evByDay[day] ??= []).push(e);
    }
  }
  const isToday = (d: number) => today.getFullYear() === ym.y && today.getMonth() === ym.m && today.getDate() === d;
  const prev = () => setYm((s) => (s.m === 0 ? { y: s.y - 1, m: 11 } : { y: s.y, m: s.m - 1 }));
  const next = () => setYm((s) => (s.m === 11 ? { y: s.y + 1, m: 0 } : { y: s.y, m: s.m + 1 }));
  const goToday = () => setYm({ y: today.getFullYear(), m: today.getMonth() });
  const dow = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded bg-gray-700 px-3 py-1.5 text-white">‹</button>
          <button onClick={next} className="rounded bg-gray-700 px-3 py-1.5 text-white">›</button>
          <button onClick={goToday} className="rounded bg-gray-500 px-3 py-1.5 text-sm text-white">今日</button>
        </div>
        <div className="text-lg font-bold">{ym.y}年{ym.m + 1}月</div>
        <div className="w-24" />
      </div>
      <div className="grid grid-cols-7 border-l border-t text-sm">
        {dow.map((d, i) => (
          <div key={d} className={"border-b border-r bg-gray-50 py-2 text-center text-xs font-medium " + (i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600")}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const col = i % 7;
          const evs = d ? evByDay[d] ?? [] : [];
          return (
            <div key={i} className={"min-h-[84px] border-b border-r p-1 align-top " + (d && isToday(d) ? "bg-yellow-50" : "")}>
              {d && <div className={"text-right text-xs " + (col === 0 ? "text-red-500" : col === 6 ? "text-blue-500" : "text-gray-500")}>{d}日</div>}
              <div className="mt-0.5 space-y-0.5">
                {evs.slice(0, 3).map((e, j) => (
                  <div key={j} className={"truncate rounded px-1 py-0.5 text-[10px] text-white " + (e.type === "通夜" ? "bg-blue-500" : "bg-purple-500")} title={e.label}>{e.label}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
