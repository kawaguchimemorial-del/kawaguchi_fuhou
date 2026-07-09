"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoJobStatus } from "@/lib/iei-photo/types";

type IeiPhotoStatusProps = {
  status: IeiPhotoJobStatus | "idle";
  /** 0-100 */
  progress: number;
  /** 表示用ラベル（例: 解析中 / 基準写真作成中 / 完了） */
  label: string;
};

/**
 * モックの処理ステータス表示。
 * 実処理ではなく、IEI_PHOTO_MOCK_STEPS に沿った擬似進行を表示する。
 */
export default function IeiPhotoStatus({
  status,
  progress,
  label,
}: IeiPhotoStatusProps) {
  if (status === "idle") {
    return null;
  }

  const isDone = status === "completed";
  const isFailed = status === "failed";

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-700">処理ステータス</p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            isFailed
              ? "bg-rose-100 text-rose-700"
              : isDone
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800",
          )}
        >
          {label}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isFailed ? "bg-rose-500" : isDone ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs text-slate-500">{progress}%</p>

      {!isDone && !isFailed && (
        <p className="mt-2 text-sm text-slate-600">
          処理中です。しばらくお待ちください…（現在はモック動作です）
        </p>
      )}
    </section>
  );
}
