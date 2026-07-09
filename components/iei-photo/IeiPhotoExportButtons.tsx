"use client";

import { cn } from "@/lib/simulatorUtils";
import type { IeiPhotoExports } from "@/lib/iei-photo/types";
import {
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "@/lib/iei-photo/export-sizes";

type IeiPhotoExportButtonsProps = {
  /** 出力結果。各値が null の場合はまだ生成されていない */
  exports: IeiPhotoExports | null;
  /** 出力ボタンを操作できるか（処理完了後に有効化） */
  enabled: boolean;
  onExport: (kind: keyof IeiPhotoExports) => void;
  /** すべて一括ダウンロード */
  onExportAll: () => void;
};

/**
 * 出力ボタン（基準写真 / 手札 / 四つ切り / 16:9モニター用）と一括ダウンロード。
 * すべて調整後の基準写真を親データとして、ブラウザ内 Canvas で書き出す。
 */
export default function IeiPhotoExportButtons({
  exports,
  enabled,
  onExport,
  onExportAll,
}: IeiPhotoExportButtonsProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-amber-700">出力</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          サイズを選んで出力
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          まず基準写真を作成し、手札・四つ切り・16:9 はそこから派生させます。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {IEI_PHOTO_EXPORT_ORDER.map((kind) => {
          const size = IEI_PHOTO_EXPORT_SIZES[kind];
          const ready = Boolean(exports?.[kind]);

          return (
            <button
              key={kind}
              type="button"
              disabled={!enabled}
              onClick={() => onExport(kind)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
                enabled
                  ? "border-stone-200 bg-white hover:border-amber-500 hover:bg-amber-50/40"
                  : "cursor-not-allowed border-stone-200 bg-stone-50 opacity-60",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-semibold text-slate-950">
                  {size.label}
                </span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {size.aspectRatio}
                </span>
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-600">
                {size.description}
              </span>
              <span className="mt-2 block text-xs font-semibold text-slate-400">
                {ready ? "ダウンロード可能" : "写真をアップロードすると出力できます"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 一括ダウンロード */}
      <div className="mt-4 border-t border-stone-200 pt-4">
        <button
          type="button"
          disabled={!enabled}
          onClick={onExportAll}
          className={cn(
            "w-full rounded-lg px-4 py-3 text-base font-semibold transition",
            "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2",
            enabled
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "cursor-not-allowed bg-stone-200 text-stone-400",
          )}
        >
          すべてダウンロード（ZIP・4サイズまとめて）
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          4サイズを1つの ZIP にまとめてダウンロードします（iei-photos.zip）。
          サイズを個別に続けて保存する場合、ブラウザが「複数ファイルのダウンロード」許可を
          求めることがあります。表示されたら「許可」してください。すべて確実に保存するには
          この ZIP ダウンロードが簡単です。
        </p>
      </div>
    </section>
  );
}
