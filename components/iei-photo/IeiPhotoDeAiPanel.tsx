"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoDeAiStrength } from "@/lib/iei-photo/types";

const STRENGTH_OPTIONS: { value: IeiPhotoDeAiStrength; label: string }[] = [
  { value: "light", label: "弱め" },
  { value: "standard", label: "標準" },
  { value: "strong", label: "強め" },
];

const STRENGTH_LABELS: Record<IeiPhotoDeAiStrength, string> = {
  light: "弱め",
  standard: "標準",
  strong: "強め",
};

type IeiPhotoDeAiPanelProps = {
  strength: IeiPhotoDeAiStrength;
  onChangeStrength: (strength: IeiPhotoDeAiStrength) => void;
  onApply: () => void;
  onRevert: () => void;
  /** 適用済みの強度（null なら未適用）。 */
  appliedStrength: IeiPhotoDeAiStrength | null;
  processing: boolean;
  disabled?: boolean;
};

/**
 * 脱AI処理パネル。
 * AI結果がある場合のみ親側で表示する。AI生成画像にのみ脱AI処理を適用する。
 */
export default function IeiPhotoDeAiPanel({
  strength,
  onChangeStrength,
  onApply,
  onRevert,
  appliedStrength,
  processing,
  disabled = false,
}: IeiPhotoDeAiPanelProps) {
  const busy = disabled || processing;
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2">
        <p className="text-sm font-semibold text-amber-700">脱AI処理</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          肌質を自然になじませる
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          AI生成特有のつるつる感や模様っぽさを抑え、写真らしい自然な質感へなじませます。
        </p>
      </div>

      {/* 強度 */}
      <div className="mt-3">
        <p className="mb-2 text-xs font-semibold text-slate-600">強度</p>
        <div className="grid grid-cols-3 gap-2">
          {STRENGTH_OPTIONS.map((opt) => {
            const isActive = opt.value === strength;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                disabled={busy}
                onClick={() => onChangeStrength(opt.value)}
                className={cn(
                  "rounded-lg border p-2 text-center text-sm font-semibold transition",
                  "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-amber-600 bg-amber-100 text-slate-950"
                    : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 実行 / 戻す */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onApply}
          disabled={busy}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? "脱AI処理中…" : "脱AI処理を実行"}
        </button>
        <button
          type="button"
          onClick={onRevert}
          disabled={busy || !appliedStrength}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          AI結果に戻す
        </button>
      </div>

      {appliedStrength && (
        <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-800">脱AI処理済み</p>
          <p className="mt-1 text-xs text-slate-700">
            強度：{STRENGTH_LABELS[appliedStrength]}
          </p>
        </div>
      )}
    </section>
  );
}
