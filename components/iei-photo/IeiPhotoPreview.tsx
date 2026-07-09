"use client";

import { cn } from "@/lib/simulatorUtils";
import IeiPhotoCropGuides from "@/components/iei-photo/IeiPhotoCropGuides";
import {
  IEI_PHOTO_EXPORT_ORDER,
  IEI_PHOTO_EXPORT_SIZES,
} from "@/lib/iei-photo/export-sizes";
import type { IeiPhotoExportKind } from "@/lib/iei-photo/types";

type IeiPhotoPreviewProps = {
  /** 元写真（Before）のローカルプレビュー URL */
  beforeUrl: string | null;
  /** 選択中の出力種類のプレビュー画像 URL（補正・トリミング反映済み） */
  outputUrl: string | null;
  /** 現在のプレビュー種類 */
  previewKind: IeiPhotoExportKind;
  onPreviewKindChange: (kind: IeiPhotoExportKind) => void;
  /** ガイド表示 ON/OFF（基準写真プレビューにのみ反映） */
  showGuides: boolean;
  onToggleGuides: (next: boolean) => void;
  /** 処理が完了したか（プレビュー未生成時の文言切り替え用） */
  completed: boolean;
};

/**
 * Before / 出力プレビュー枠。
 * 出力種類（基準写真 / 手札 / 四つ切り / 16:9）を切り替えて確認できる。
 * ガイドは表示専用のオーバーレイで、書き出し画像には焼き込まない。
 */
export default function IeiPhotoPreview({
  beforeUrl,
  outputUrl,
  previewKind,
  onPreviewKindChange,
  showGuides,
  onToggleGuides,
  completed,
}: IeiPhotoPreviewProps) {
  const size = IEI_PHOTO_EXPORT_SIZES[previewKind];
  const aspect = `${size.pixelGuide.width} / ${size.pixelGuide.height}`;
  const guidesVisible = previewKind === "base" && showGuides;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-amber-700">プレビュー</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            出力イメージの確認
          </h2>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => onToggleGuides(e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          ガイドを表示する
        </label>
      </div>

      {/* 出力種類の切り替え */}
      <div className="mb-4 flex flex-wrap gap-2">
        {IEI_PHOTO_EXPORT_ORDER.map((kind) => {
          const isActive = kind === previewKind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={isActive}
              onClick={() => onPreviewKindChange(kind)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                isActive
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-stone-300 bg-white text-slate-700 hover:bg-stone-100",
              )}
            >
              {IEI_PHOTO_EXPORT_SIZES[kind].label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Before */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Before（元写真）</p>
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
            {beforeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={beforeUrl}
                alt="元写真"
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-4 text-center text-sm text-slate-500">
                写真をアップロードすると表示されます
              </span>
            )}
          </div>
        </div>

        {/* 出力プレビュー（選択中の種類） */}
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">
            出力プレビュー（{size.label}）
          </p>
          <div
            className="relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50"
            style={{ aspectRatio: aspect }}
          >
            {outputUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={outputUrl}
                  alt={`${size.label}のプレビュー`}
                  className="h-full w-full object-contain"
                />
                {guidesVisible && <IeiPhotoCropGuides />}
              </>
            ) : (
              <span className="whitespace-pre-line px-4 text-center text-sm text-slate-500">
                {completed
                  ? "プレビューを生成できませんでした。"
                  : "写真をアップロードすると、補正後のプレビューが表示されます"}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {previewKind === "monitor169"
              ? "16:9 の横長キャンバスに基準写真を中央配置（余白背景込み）。"
              : "ガイド線は確認用の表示で、書き出し画像には含まれません。"}
          </p>
        </div>
      </div>
    </section>
  );
}
