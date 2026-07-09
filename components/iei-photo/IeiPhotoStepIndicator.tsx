"use client";

import { cn } from "@/lib/simulatorUtils";

/** AI遺影写真生成の処理ステップ（同一ページ内での進行表示） */
export const IEI_PHOTO_STEPS = [
  "写真アップロード",
  "AI生成設定",
  "基準写真生成",
  "確認・手動調整",
  "出力",
] as const;

type IeiPhotoStepIndicatorProps = {
  /** 現在のステップ番号（1〜5） */
  currentStep: number;
};

export default function IeiPhotoStepIndicator({
  currentStep,
}: IeiPhotoStepIndicatorProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="mb-3 text-sm font-semibold text-amber-700">進行状況</p>
      <ol className="flex flex-wrap items-center gap-2">
        {IEI_PHOTO_STEPS.map((label, index) => {
          const stepNo = index + 1;
          const isDone = stepNo < currentStep;
          const isCurrent = stepNo === currentStep;

          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  isCurrent
                    ? "border-amber-600 bg-amber-600 text-white"
                    : isDone
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-stone-300 bg-white text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    isCurrent
                      ? "bg-white/20 text-white"
                      : isDone
                        ? "bg-amber-200 text-amber-800"
                        : "bg-stone-200 text-slate-600",
                  )}
                >
                  {isDone ? "✓" : stepNo}
                </span>
                {label}
              </span>
              {stepNo < IEI_PHOTO_STEPS.length && (
                <span aria-hidden="true" className="text-stone-300">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
