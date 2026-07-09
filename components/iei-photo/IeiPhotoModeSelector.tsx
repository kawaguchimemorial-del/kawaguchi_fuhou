"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoMode } from "@/lib/iei-photo/types";
import {
  IEI_PHOTO_MODE_ORDER,
  IEI_PHOTO_MODE_RULES,
} from "@/lib/iei-photo/image-rules";

type IeiPhotoModeSelectorProps = {
  selectedMode: IeiPhotoMode;
  onSelect: (mode: IeiPhotoMode) => void;
  disabled?: boolean;
};

/**
 * 加工モード選択。
 * 各モードで許可/禁止される操作は image-rules.ts に明示されており、ここで概要を表示する。
 */
export default function IeiPhotoModeSelector({
  selectedMode,
  onSelect,
  disabled = false,
}: IeiPhotoModeSelectorProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">AI生成モード</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          AI生成モードを選択
        </h2>
      </div>

      <div className="grid gap-3">
        {IEI_PHOTO_MODE_ORDER.map((mode) => {
          const rule = IEI_PHOTO_MODE_RULES[mode];
          const isSelected = mode === selectedMode;

          return (
            <button
              key={mode}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => onSelect(mode)}
              className={cn(
                "rounded-lg border p-4 text-left transition hover:border-amber-500 hover:bg-amber-50/40",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? "border-amber-600 bg-amber-50 shadow-sm"
                  : "border-stone-200 bg-white",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="block text-base font-semibold text-slate-950">
                  {rule.label}
                </span>
                {rule.requiresExplicitConsent && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    要許可
                  </span>
                )}
              </span>
              <span className="mt-2 block text-sm leading-6 text-slate-700">
                {rule.summary}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
