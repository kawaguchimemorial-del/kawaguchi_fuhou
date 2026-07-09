"use client";

/**
 * 生成完了後の次アクション。
 * - このままダウンロード
 * - 手動で微調整する
 * - 高度AI補正へ進む（現時点では未実装メッセージを表示）
 */
type IeiPhotoNextActionsProps = {
  onDownloadAll: () => void;
  onAdjust: () => void;
  onAdvancedAi: () => void;
  disabled?: boolean;
};

export default function IeiPhotoNextActions({
  onDownloadAll,
  onAdjust,
  onAdvancedAi,
  disabled = false,
}: IeiPhotoNextActionsProps) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <p className="text-sm font-semibold text-amber-800">生成が完了しました</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950">次の操作を選択</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onDownloadAll}
          disabled={disabled}
          className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          このままダウンロード
        </button>
        <button
          type="button"
          onClick={onAdjust}
          disabled={disabled}
          className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          手動で微調整する
        </button>
        <button
          type="button"
          onClick={onAdvancedAi}
          disabled={disabled}
          className="rounded-lg border border-amber-400 bg-white px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          高度AI補正へ進む
        </button>
      </div>
    </section>
  );
}
