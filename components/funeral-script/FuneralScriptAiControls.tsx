"use client";

import { cn } from "@/lib/simulatorUtils";

type FuneralScriptAiControlsProps = {
  /** AI生成対象（ai_placeholder）の件数 */
  targetCount: number;
  /** すでにAI生成済みのセクションがあるか */
  hasGenerated: boolean;
  loading: boolean;
  error: string | null;
  warnings: string[];
  onGenerate: () => void;
  onRevert: () => void;
  /** AI生成前に戻せるか（退避スナップショットがあるか） */
  canRevert: boolean;
};

/**
 * AIナレーション生成の操作カード（印刷時は非表示）。
 * - ナレーション系（ai_placeholder）が存在するときのみ表示。
 * - 生成は固定テンプレート部分を変更しない旨を明示する。
 */
export default function FuneralScriptAiControls({
  targetCount,
  hasGenerated,
  loading,
  error,
  warnings,
  onGenerate,
  onRevert,
  canRevert,
}: FuneralScriptAiControlsProps) {
  if (targetCount === 0) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-950">
          AIナレーション生成
        </h2>
        {hasGenerated && (
          <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            AI生成済み
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        入力された故人情報をもとに、開式・メイン・閉式前などのナレーション部分だけを生成します。
        進行案内や焼香案内などの固定部分は変更しません。
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-700">
        ※ AI生成すると、現在のナレーション本文（{targetCount}件）は置き換わります。
      </p>

      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className={cn(
            "min-h-11 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700",
            "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {loading ? "AIナレーションを作成しています..." : "AIナレーションを生成"}
        </button>
        <button
          type="button"
          onClick={onRevert}
          disabled={loading || !canRevert}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          AI生成前に戻す
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-amber-800">
            確認してください（{warnings.length}件）
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs leading-5 text-slate-700">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
