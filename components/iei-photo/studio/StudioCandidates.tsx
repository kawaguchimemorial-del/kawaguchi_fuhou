"use client";

import { cn } from "@/lib/simulatorUtils";

export type StudioCandidate = {
  id: string;
  label: string;
  /** サムネイル画像（無ければプレースホルダ表示）。 */
  thumbUrl: string | null;
  active: boolean;
};

/**
 * 下部の「仕上げ候補」サムネイル列（モック準拠）。
 * 各候補はワンタップで補正プリセットを適用/解除するショートカット。
 * チェックは現在適用中のプリセットを表す。
 */
export default function StudioCandidates({
  items,
  disabled = false,
  onToggle,
}: {
  items: StudioCandidate[];
  disabled?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800">仕上げ候補</h3>
        <span className="text-xs font-medium text-slate-400">
          タップで適用 / 解除
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.active}
            disabled={disabled}
            onClick={() => onToggle(item.id)}
            className={cn(
              "group relative w-28 shrink-0 text-left",
              "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <div
              className={cn(
                "relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg border bg-stone-100 transition",
                item.active
                  ? "border-slate-800 ring-2 ring-slate-800/25"
                  : "border-stone-200 group-hover:border-stone-300",
              )}
            >
              {item.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbUrl}
                  alt={item.label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-[11px] text-slate-400">候補</span>
              )}
              {item.active && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
              )}
            </div>
            <p className="mt-1.5 truncate text-center text-xs font-medium text-slate-600">
              {item.label}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
