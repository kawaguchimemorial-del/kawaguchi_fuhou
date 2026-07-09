"use client";

import { cn } from "@/lib/simulatorUtils";
import {
  IEI_PHOTO_BACKGROUND_OPTIONS,
  supportsBackgroundGradient,
} from "@/lib/iei-photo/backgrounds";
import type {
  IeiPhotoBackgroundSettings,
  IeiPhotoBackgroundType,
} from "@/lib/iei-photo/types";

type IeiPhotoBackgroundPanelProps = {
  settings: IeiPhotoBackgroundSettings;
  onChangeType: (type: IeiPhotoBackgroundType) => void;
  onChangeGradient?: (next: boolean) => void;
  onGenerateAiBackground?: () => void;
  generating?: boolean;
  hasBase?: boolean;
  disabled?: boolean;
};

/** 背景設定パネル。選択した背景テーマを AI 画像生成に渡す。 */
export default function IeiPhotoBackgroundPanel({
  settings,
  onChangeType,
  onChangeGradient,
  onGenerateAiBackground,
  generating = false,
  hasBase = false,
  disabled = false,
}: IeiPhotoBackgroundPanelProps) {
  const canUseGradient = supportsBackgroundGradient(settings.type);
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-amber-700">AI背景</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          背景タイプを選択
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {IEI_PHOTO_BACKGROUND_OPTIONS.map((option) => {
          const isActive = option.type === settings.type;
          return (
            <button
              key={option.type}
              type="button"
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => onChangeType(option.type)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 text-left text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-amber-600 bg-amber-50 text-slate-950"
                  : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50",
              )}
            >
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded border border-stone-300"
                style={{ background: option.swatchCss }}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      {canUseGradient && onChangeGradient && (
        <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-slate-700">
          グラデーションにする
          <input
            type="checkbox"
            checked={Boolean(settings.gradient)}
            disabled={disabled}
            onChange={(e) => onChangeGradient(e.target.checked)}
            className="h-4 w-4 accent-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      )}

      {onGenerateAiBackground && (
        <button
          type="button"
          onClick={onGenerateAiBackground}
          disabled={disabled || generating || !hasBase}
          className="mt-4 w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "AI生成中…" : "背景込みでAI生成"}
        </button>
      )}
    </section>
  );
}
