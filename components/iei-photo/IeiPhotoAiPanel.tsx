"use client";

import { cn } from "@/lib/simulatorUtils";
import {
  IEI_PHOTO_CLOTHING_LABELS,
  IEI_PHOTO_CLOTHING_ORDER,
  IEI_PHOTO_POSE_LABELS,
  IEI_PHOTO_POSE_ORDER,
} from "@/lib/iei-photo/ai-prompts";
import type {
  IeiPhotoAiResultMode,
  IeiPhotoClothingStyle,
  IeiPhotoMode,
  IeiPhotoPose,
} from "@/lib/iei-photo/types";

type IeiPhotoAiPanelProps = {
  /** 現在のAI生成モード（AI標準以外＝このパネルが表示される）。 */
  mode: IeiPhotoMode;
  clothingStyle: IeiPhotoClothingStyle;
  onChangeClothing: (style: IeiPhotoClothingStyle) => void;
  /** 体勢・向き（AIモードのみ）。 */
  pose: IeiPhotoPose;
  onChangePose: (pose: IeiPhotoPose) => void;
  /** AI肖像生成の許可（mode=AI_PORTRAIT のとき必須）。 */
  allowPortrait: boolean;
  onTogglePortrait: (next: boolean) => void;
  /** AIに全てお任せの許可（お任せ実行に必須）。 */
  allowAuto: boolean;
  onToggleAuto: (next: boolean) => void;
  /** 高度AI補正を実行。 */
  onAdvanced: () => void;
  /** AIに全てお任せを実行。 */
  onAuto: () => void;
  /** AI処理中か。 */
  aiProcessing: boolean;
  /** 直近のAI結果種別（null なら未実行）。 */
  aiResultMode: IeiPhotoAiResultMode;
  /** AI結果を解除して通常生成に戻す。 */
  onClearAiResult: () => void;
  /** 基準写真がまだ無い等で操作不可。 */
  disabled?: boolean;
};

const AI_RESULT_LABELS: Record<"advanced" | "portrait" | "auto", string> = {
  advanced: "AI高度補正済み",
  portrait: "AI肖像生成済み",
  auto: "AIお任せ生成済み",
};

/**
 * AIモード専用パネル（高度AI補正 / AI肖像生成 / AIに全てお任せ）。
 * - 服装選択（AIモードのみ反映）
 * - AIに全てお任せボタン（許可チェック必須）
 * - 高度AI補正ボタン
 * - AI結果のステータス表示と解除
 * AI標準生成では親側で非表示にする（このパネルは AI モードのときだけ表示）。
 */
export default function IeiPhotoAiPanel({
  mode,
  clothingStyle,
  onChangeClothing,
  pose,
  onChangePose,
  allowPortrait,
  onTogglePortrait,
  allowAuto,
  onToggleAuto,
  onAdvanced,
  onAuto,
  aiProcessing,
  aiResultMode,
  onClearAiResult,
  disabled = false,
}: IeiPhotoAiPanelProps) {
  const busy = disabled || aiProcessing;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <p className="text-sm font-semibold text-amber-700">AIモード設定</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          服装選択（AIモードのみ）
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          AI生成時のみ服装変更が反映されます。通常生成では服装変更は行いません。
        </p>
      </div>

      {/* 服装選択 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {IEI_PHOTO_CLOTHING_ORDER.map((style) => {
          const isActive = style === clothingStyle;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              disabled={busy}
              onClick={() => onChangeClothing(style)}
              className={cn(
                "rounded-lg border p-2 text-center text-sm font-semibold transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-amber-600 bg-amber-100 text-slate-950"
                  : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50",
              )}
            >
              {IEI_PHOTO_CLOTHING_LABELS[style]}
            </button>
          );
        })}
      </div>

      {/* 体勢・向き（AIモードのみ） */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-900">体勢・向き（AIモードのみ）</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          AI生成時に体勢や顔の向きを指定できます（例: 正面を向く）。通常生成では反映されません。
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {IEI_PHOTO_POSE_ORDER.map((p) => {
            const isActive = p === pose;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={isActive}
                disabled={busy}
                onClick={() => onChangePose(p)}
                className={cn(
                  "rounded-lg border p-2 text-center text-sm font-semibold transition",
                  "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  isActive
                    ? "border-amber-600 bg-amber-100 text-slate-950"
                    : "border-stone-200 bg-white text-slate-700 hover:bg-stone-50",
                )}
              >
                {IEI_PHOTO_POSE_LABELS[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI肖像生成の許可（肖像モードのみ） */}
      {mode === "AI_PORTRAIT" && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={allowPortrait}
              onChange={(e) => onTogglePortrait(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-rose-600"
            />
            <span>
              <span className="font-semibold">AI肖像生成を許可する</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                AI肖像生成は人物も含めて画像を生成するため、元写真と完全一致しない場合があります。元写真の状態が悪い場合のみ使用してください。「AI遺影写真を生成する」を押すと実行されます。
              </span>
            </span>
          </label>
        </div>
      )}

      {/* AIに全てお任せ */}
      <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">AIに全てお任せ</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          背景・明るさ・構図・服装をAIがまとめて判断します。元写真と完全一致しない場合があります。
        </p>
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={allowAuto}
            onChange={(e) => onToggleAuto(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-amber-600"
          />
          <span className="font-semibold">AIに全てお任せ生成を許可する</span>
        </label>
        <button
          type="button"
          onClick={onAuto}
          disabled={busy || !allowAuto}
          className="mt-3 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiProcessing ? "AIにお任せ生成中…" : "AIに全てお任せ"}
        </button>
      </div>

      {/* 高度AI補正 */}
      <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
        <p className="text-sm font-semibold text-slate-900">高度AI補正</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          現在の基準写真を、白飛び・影・背景境界・明るさなどAIで自然に補正します。本人らしさは保持します。
        </p>
        <button
          type="button"
          onClick={onAdvanced}
          disabled={busy}
          className="mt-3 w-full rounded-lg border border-amber-400 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiProcessing ? "AI高度補正中…" : "高度AI補正を実行"}
        </button>
      </div>

      {/* AI結果ステータス + 解除 */}
      {aiResultMode && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-800">
            {AI_RESULT_LABELS[aiResultMode]}
          </p>
          <p className="mt-1 text-xs text-slate-700">
            服装：{IEI_PHOTO_CLOTHING_LABELS[clothingStyle]}
          </p>
          <button
            type="button"
            onClick={onClearAiResult}
            disabled={aiProcessing}
            className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            AI結果を解除して通常生成に戻す
          </button>
        </div>
      )}
    </section>
  );
}
