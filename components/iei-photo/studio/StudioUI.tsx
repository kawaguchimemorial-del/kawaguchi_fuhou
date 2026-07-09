"use client";

import { cn } from "@/lib/simulatorUtils";

/**
 * メモリアルフォトサポート（スタジオUI）の小さな共通パーツ。
 * 見た目はモック（遺影写真AI.png）に合わせ、配色は slate / stone / amber 基調。
 * ここは表示用パーツのみで、画像加工ロジックは持たない。
 */

/** セクション見出し（アイコン＋タイトル）。 */
export function StudioSectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-slate-800">
      <span aria-hidden="true" className="text-slate-500">
        {icon}
      </span>
      <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
    </div>
  );
}

/** 値ラベル付きスライダー（右肩に現在値）。 */
export function StudioSlider({
  label,
  value,
  min,
  max,
  step = 1,
  valueLabel,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="py-1.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-700">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

/** トグルスイッチ（右寄せ）。 */
export function StudioToggle({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
          "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-slate-800" : "bg-stone-300",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/** ピル型の単一選択（トリミング比率など）。 */
export function StudioPillGroup<T extends string>({
  options,
  value,
  disabled = false,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-slate-800 text-white"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** スウォッチ選択（背景タイプ）。サムネ風の四角＋ラベル。 */
export function StudioSwatchGroup<T extends string>({
  options,
  value,
  disabled = false,
  onChange,
}: {
  options: { value: T; label: string; css: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "group flex flex-col items-center gap-1.5",
              "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-12 w-full rounded-lg border transition",
                active
                  ? "border-slate-800 ring-2 ring-slate-800/30"
                  : "border-stone-300 group-hover:border-stone-400",
              )}
              style={{ background: opt.css }}
            />
            <span
              className={cn(
                "text-[11px] font-semibold",
                active ? "text-slate-800" : "text-slate-500",
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
